import crypto from "node:crypto";
import prisma from "@/lib/db";
import { sendTransactionalEmail, buildOtpEmailHtml } from "@/lib/email/emailService";
import { sendOtpToSms, normalizeAndValidatePhone } from "@/lib/sms/smsService";

// Attempt tracking and cooldown memory map to prevent brute-force attacks
interface OtpState {
  attempts: number;
  lastSentAt: number;
}

const otpStateMap = new Map<string, OtpState>();

// Periodically clean up stale state entries
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of otpStateMap.entries()) {
    if (now - state.lastSentAt > 15 * 60 * 1000) {
      otpStateMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes an immutable SHA-256 hash of an OTP code for secure at-rest storage.
 */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}

/**
 * Checks whether an identifier is currently in a resend cooldown period (60 seconds).
 */
export function checkResendCooldown(identifier: string, cooldownSeconds: number = 60): { allowed: boolean; waitSeconds: number } {
  const state = otpStateMap.get(identifier.toLowerCase());
  if (!state) {
    return { allowed: true, waitSeconds: 0 };
  }
  const elapsedSeconds = Math.floor((Date.now() - state.lastSentAt) / 1000);
  if (elapsedSeconds < cooldownSeconds) {
    return { allowed: false, waitSeconds: cooldownSeconds - elapsedSeconds };
  }
  return { allowed: true, waitSeconds: 0 };
}

/**
 * Sends a cryptographically secure OTP code to an email address.
 * Stores the OTP as an SHA-256 hash in the database with a 5-minute expiry.
 */
export async function sendOtpToEmail(
  email: string,
  otp: string,
  purpose: "SIGNUP" | "LOGIN" | "RESET" = "SIGNUP"
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const hashed = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  // Save secure hash and expiry in database
  await prisma.user.updateMany({
    where: { email: cleanEmail },
    data: {
      otpCode: hashed,
      otpExpiresAt: expiresAt,
    },
  });

  // Track state for cooldown and attempts
  otpStateMap.set(cleanEmail, {
    attempts: 0,
    lastSentAt: Date.now(),
  });

  // Transmit via transactional email provider
  const emailHtml = buildOtpEmailHtml(otp, 5);
  const subject = purpose === "LOGIN" ? "Your TYPnex Login Code" : "Your TYPnex Verification Code";

  const delivery = await sendTransactionalEmail({
    to: cleanEmail,
    subject,
    html: emailHtml,
  });

  // Notice: We log delivery status, never the raw OTP code
  if (delivery.success) {
    console.log(`[TYPnex Auth] OTP transmitted successfully to ${cleanEmail}`);
  } else {
    console.warn(`[TYPnex Auth] OTP delivery warning for ${cleanEmail}: ${delivery.error || "Provider not configured"}`);
  }

  return delivery;
}

/**
 * Sends an OTP code to a phone number via SMS (Twilio / MSG91).
 */
export async function sendOtpToPhoneNumber(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const { valid, normalized, error: valError } = normalizeAndValidatePhone(phone);
  if (!valid) {
    return { success: false, error: valError };
  }

  // Update rate limiter state
  otpStateMap.set(normalized, {
    attempts: 0,
    lastSentAt: Date.now(),
  });

  const delivery = await sendOtpToSms({
    to: normalized,
    otp,
    expiryMinutes: 5,
  });

  if (delivery.success) {
    console.log(`[TYPnex Auth] SMS OTP dispatched to ${normalized.slice(0, 4)}...${normalized.slice(-4)}`);
  }

  return delivery;
}

/**
 * Verifies a candidate OTP against the stored database hash.
 * Enforces attempt limits (max 5), expiration checks, and timing-safe hash comparison.
 */
export async function verifyUserOTP(email: string, candidateOtp: string): Promise<{ valid: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    select: {
      id: true,
      otpCode: true,
      otpExpiresAt: true,
    },
  });

  if (!user || !user.otpCode || !user.otpExpiresAt) {
    return { valid: false, error: "No pending verification found. Please request a new code." };
  }

  // 1. Check expiration
  if (new Date() > user.otpExpiresAt) {
    // Invalidate expired OTP
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null },
    });
    return { valid: false, error: "Verification code has expired. Please request a new one." };
  }

  // 2. Enforce attempt limits (max 5)
  const state = otpStateMap.get(cleanEmail) || { attempts: 0, lastSentAt: Date.now() };
  state.attempts += 1;
  otpStateMap.set(cleanEmail, state);

  if (state.attempts > 5) {
    // Invalidate compromised OTP
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiresAt: null },
    });
    otpStateMap.delete(cleanEmail);
    return { valid: false, error: "Too many failed attempts. Code invalidated for your security. Please request a new code." };
  }

  // 3. Cryptographic timing-safe verification
  // Supports both modern hashed OTPs (64-char hex) and legacy plaintext OTPs during rollout
  const candidateTrimmed = candidateOtp.trim();
  const candidateHash = hashOtp(candidateTrimmed);

  let isMatch = false;

  if (user.otpCode.length === 64) {
    // Hashed comparison
    const storedBuf = Buffer.from(user.otpCode, "hex");
    const candidateBuf = Buffer.from(candidateHash, "hex");
    if (storedBuf.length === candidateBuf.length) {
      isMatch = crypto.timingSafeEqual(storedBuf, candidateBuf);
    }
  } else {
    // Plaintext fallback comparison (timing safe)
    const storedBuf = Buffer.from(user.otpCode);
    const candidateBuf = Buffer.from(candidateTrimmed);
    if (storedBuf.length === candidateBuf.length) {
      isMatch = crypto.timingSafeEqual(storedBuf, candidateBuf);
    }
  }

  if (!isMatch) {
    const remainingAttempts = Math.max(0, 5 - state.attempts);
    return {
      valid: false,
      error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
    };
  }

  // 4. Mark verified and invalidate OTP immediately to prevent replay
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      otpCode: null,
      otpExpiresAt: null,
    },
  });

  otpStateMap.delete(cleanEmail);

  return { valid: true };
}
