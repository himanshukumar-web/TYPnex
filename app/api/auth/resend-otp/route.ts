import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateOTP, sendOtpToEmail, checkResendCooldown } from "@/lib/auth/otp";
import { enforceRateLimit } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, "AUTH_OTP");
    if (rateLimitBlocked) return rateLimitBlocked;

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check resend cooldown (60 seconds)
    const cooldown = checkResendCooldown(cleanEmail, 60);
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          error: `Please wait ${cooldown.waitSeconds} seconds before requesting another verification code.`,
          retryAfter: cooldown.waitSeconds,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Prevent email enumeration: return standard success message even if not found
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a verification code has been dispatched.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "Email is already verified. Please sign in.",
      });
    }

    const otp = generateOTP();
    const emailResult = await sendOtpToEmail(cleanEmail, otp, "SIGNUP");

    return NextResponse.json({
      success: true,
      emailDelivery: emailResult,
      retryAfter: 60,
      message: emailResult.success
        ? "A new verification code has been sent to your email."
        : `A new verification code was generated. Note: Email delivery unavailable (${emailResult.error || "Email provider credentials not configured"}).`,
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json({ error: "Failed to resend verification code." }, { status: 500 });
  }
}
