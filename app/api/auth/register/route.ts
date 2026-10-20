import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { generateOTP, sendOtpToEmail, sendOtpToPhoneNumber } from "@/lib/auth/otp";
import { normalizeAndValidatePhone } from "@/lib/sms/smsService";
import { ensureSystemSeeded } from "@/lib/seed";
import { enforceRateLimit } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, "AUTH_SIGNUP");
    if (rateLimitBlocked) return rateLimitBlocked;

    await ensureSystemSeeded();
    const body = await req.json();
    const { name, email, password, confirmPassword, preferredLanguage, phone } = body;

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

    // Validate phone format if provided
    let normalizedPhone: string | undefined;
    if (phone && phone.trim()) {
      const phoneVal = normalizeAndValidatePhone(phone);
      if (!phoneVal.valid) {
        return NextResponse.json({ error: phoneVal.error }, { status: 400 });
      }
      normalizedPhone = phoneVal.normalized;
    }

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
      }
      // If user exists but not verified, update password and issue fresh OTP
      const passwordHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name.trim(),
          passwordHash,
          preferredLanguage: preferredLanguage || "en",
        },
      });

      const otp = generateOTP();
      const emailResult = await sendOtpToEmail(cleanEmail, otp, "SIGNUP");
      if (normalizedPhone) {
        await sendOtpToPhoneNumber(normalizedPhone, otp);
      }

      return NextResponse.json({
        success: true,
        email: cleanEmail,
        message: emailResult.success
          ? "Account created. Please verify the 6-digit verification code sent to your email."
          : "Account created. Verification code generated (ensure email delivery credentials are set).",
      });
    }

    // Create new unverified user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        preferredLanguage: preferredLanguage || "en",
        role: "USER",
        emailVerified: false,
        profile: {
          create: {
            themePreference: "light",
            notificationsEnabled: true,
          },
        },
      },
    });

    const otp = generateOTP();
    const emailResult = await sendOtpToEmail(cleanEmail, otp, "SIGNUP");
    if (normalizedPhone) {
      await sendOtpToPhoneNumber(normalizedPhone, otp);
    }

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      userId: user.id,
      message: emailResult.success
        ? "Registration successful. Please enter the 6-digit verification code sent to your email."
        : "Registration successful. Verification code generated.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
