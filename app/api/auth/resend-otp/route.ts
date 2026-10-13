import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateOTP, sendOtpToEmail } from "@/lib/auth/otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const otp = generateOTP();
    await sendOtpToEmail(cleanEmail, otp, "SIGNUP");

    return NextResponse.json({
      success: true,
      message: "A new OTP code has been sent to your email.",
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json({ error: "Failed to resend OTP." }, { status: 500 });
  }
}
