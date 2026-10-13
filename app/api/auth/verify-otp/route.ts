import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyUserOTP } from "@/lib/auth/otp";
import { signJwt } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { createDefaultUserConversations } from "@/lib/chat/defaultConversations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isValid = await verifyUserOTP(cleanEmail, otp.trim());

    if (!isValid) {
      return NextResponse.json({ error: "Invalid or expired OTP code. Please check and try again." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Step 2: Auto-create the 3 required default onboarding conversations in their selected language!
    await createDefaultUserConversations(user.id, user.name, user.preferredLanguage || "en");

    // Generate session token
    const token = signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "USER" | "EMPLOYEE" | "ADMIN",
      isVerified: user.isVerified,
    });

    const response = NextResponse.json({
      success: true,
      message: "Email successfully verified. Welcome to Typnex!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        preferredLanguage: user.preferredLanguage,
      },
    });

    // Set secure cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Failed to verify OTP." }, { status: 500 });
  }
}
