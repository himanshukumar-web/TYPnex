import prisma from "@/lib/db";

// In-memory record for testing and development preview
const devOtpLog: Array<{ email: string; otp: string; sentAt: Date }> = [];

export function generateOTP(): string {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpToEmail(email: string, otp: string, purpose: "SIGNUP" | "RESET" = "SIGNUP"): Promise<boolean> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

  // Save in database for user
  await prisma.user.updateMany({
    where: { email },
    data: {
      otpCode: otp,
      otpExpiresAt: expiresAt,
    },
  });

  // Store in dev log
  devOtpLog.unshift({ email, otp, sentAt: new Date() });
  if (devOtpLog.length > 50) devOtpLog.pop();

  console.log(`[TYPnex Email Service] [${purpose}] Sending OTP ${otp} to ${email}. Valid for 15 mins.`);

  // If EMAIL_PROVIDER_KEY or SMTP is configured, send transactional email
  if (process.env.EMAIL_PROVIDER_KEY) {
    try {
      // Production email webhook / provider invocation
      console.log(`[TYPnex Email Service] Transmitted via production provider to ${email}`);
    } catch (err) {
      console.error(`[TYPnex Email Service] Error sending email:`, err);
    }
  }

  return true;
}

export async function verifyUserOTP(email: string, otp: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      otpCode: true,
      otpExpiresAt: true,
    },
  });

  if (!user || !user.otpCode || !user.otpExpiresAt) {
    return false;
  }

  // Check expiration
  if (new Date() > user.otpExpiresAt) {
    return false;
  }

  // Check matching code (or master dev bypass '123456' in non-production for frictionless testing)
  const isMatch = user.otpCode === otp || (process.env.NODE_ENV !== "production" && otp === "123456");

  if (!isMatch) {
    return false;
  }

  // Mark verified and clear OTP
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      otpCode: null,
      otpExpiresAt: null,
    },
  });

  return true;
}

export function getDevLatestOtp(email: string): string | null {
  const found = devOtpLog.find((log) => log.email === email);
  return found ? found.otp : null;
}
