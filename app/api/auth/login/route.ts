import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { comparePassword } from "@/lib/auth/password";
import { signJwt } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { generateOTP, sendOtpToEmail } from "@/lib/auth/otp";
import { enforceRateLimit } from "@/lib/security/rateLimiter";
import { ensureSystemSeeded } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, "AUTH_LOGIN");
    if (rateLimitBlocked) return rateLimitBlocked;

    await ensureSystemSeeded();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { blockedRecord: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check blocked status
    if (user.isBlocked) {
      return NextResponse.json(
        {
          error: "Your account has been blocked.",
          reason: user.blockedRecord?.reason || "Policy violation.",
          isBlocked: true,
        },
        { status: 403 }
      );
    }

    // Compare password
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Check if email verified
    if (!user.emailVerified) {
      const otp = generateOTP();
      await sendOtpToEmail(cleanEmail, otp, "LOGIN");
      return NextResponse.json({
        requiresVerification: true,
        email: cleanEmail,
        message: "Please verify your email address to continue. We have sent a verification code to your email.",
      });
    }

    // Sign session JWT
    const token = signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "USER" | "EMPLOYEE" | "ADMIN",
      isVerified: user.isVerified,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        preferredLanguage: user.preferredLanguage,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }
}
