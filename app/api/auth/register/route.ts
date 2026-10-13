import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { generateOTP, sendOtpToEmail } from "@/lib/auth/otp";
import { ensureSystemSeeded } from "@/lib/seed";

import { enforceRateLimit } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, "AUTH_SIGNUP");
    if (rateLimitBlocked) return rateLimitBlocked;

    await ensureSystemSeeded();
    const body = await req.json();
    const { name, email, password, confirmPassword, preferredLanguage } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
      }
      // If user exists but not verified, update password and send new OTP
      const passwordHash = await hashPassword(password);
      const otp = generateOTP();
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          passwordHash,
          preferredLanguage: preferredLanguage || "en",
          otpCode: otp,
          otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await sendOtpToEmail(cleanEmail, otp, "SIGNUP");
      return NextResponse.json({
        success: true,
        email: cleanEmail,
        message: "Account created. Please verify the OTP sent to your email.",
        devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    }

    // Create new unverified user
    const passwordHash = await hashPassword(password);
    const otp = generateOTP();

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        preferredLanguage: preferredLanguage || "en",
        role: "USER",
        emailVerified: false,
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        profile: {
          create: {
            themePreference: "light",
            notificationsEnabled: true,
          },
        },
      },
    });

    await sendOtpToEmail(cleanEmail, otp, "SIGNUP");

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      userId: user.id,
      message: "Registration successful. Please verify the 6-digit OTP sent to your email.",
      devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
