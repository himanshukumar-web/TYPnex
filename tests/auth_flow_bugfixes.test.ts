import { hashPassword, comparePassword } from "../lib/auth/password";
import { generateOTP, verifyUserOTP, sendOtpToEmail, checkResendCooldown, hashOtp } from "../lib/auth/otp";
import { signJwt, verifyJwt } from "../lib/auth/jwt";
import { ensureSystemSeeded } from "../lib/seed";
import prisma from "../lib/db";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runAuthFlowTests() {
  console.log("\n=======================================================");
  console.log("   TYPnex Authentication & Bugfix Integration Suite");
  console.log("=======================================================\n");

  await ensureSystemSeeded();

  // 1. Password Hashing & Verification
  console.log("1. PASSWORD SECURITY & COMPARISON");
  const plainPassword = "TestSecretPassword#2026";
  const hashed = await hashPassword(plainPassword);
  assert(await comparePassword(plainPassword, hashed), "Password successfully verified against salted hash");
  assert(!(await comparePassword("WrongPassword#2026", hashed)), "Incorrect password strictly rejected");

  // 2. Full User Registration & OTP Issuance
  console.log("\n2. USER REGISTRATION & CRYPTOGRAPHIC OTP DELIVERY");
  const testEmail = `qa_verify_${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      name: "QA Verification User",
      email: testEmail,
      passwordHash: hashed,
      role: "USER",
      emailVerified: false,
      profile: {
        create: {
          themePreference: "light",
          notificationsEnabled: true,
        },
      },
    },
    include: { profile: true },
  });

  assert(Boolean(user.id), "User record created in database with unique ID");
  assert(user.emailVerified === false, "User initial state is unverified");

  const otp = generateOTP();
  const sendResult = await sendOtpToEmail(testEmail, otp, "SIGNUP");
  assert(Boolean(sendResult), "sendOtpToEmail execution completed");

  // Verify OTP hash stored at-rest
  const dbUser = await prisma.user.findUnique({
    where: { email: testEmail },
    include: { profile: true },
  });
  assert(dbUser?.otpCode?.length === 64, "OTP stored as SHA-256 hash (64 hex characters)");
  assert(dbUser?.otpCode === hashOtp(otp), "Stored hash matches hashOtp(otp)");
  assert(Boolean(dbUser?.profile), "Nested user profile relation retrieved successfully");

  // 3. Cooldown & Attempt Limits
  console.log("\n3. RESEND COOLDOWN & BRUTE-FORCE SECURITY");
  const cooldownAfterSend = checkResendCooldown(testEmail, 60);
  assert(!cooldownAfterSend.allowed && cooldownAfterSend.waitSeconds > 0, "60-second resend cooldown active immediately after send");

  const invalidAttempt = await verifyUserOTP(testEmail, "999999");
  assert(!invalidAttempt.valid, "Invalid OTP code rejected");

  // 4. Verification & Email Verification Flag
  console.log("\n4. OTP VERIFICATION & ACTIVATION");
  const validAttempt = await verifyUserOTP(testEmail, otp);
  assert(validAttempt.valid, "Valid 6-digit OTP code accepted");

  const verifiedUser = await prisma.user.findUnique({ where: { email: testEmail } });
  assert(verifiedUser?.emailVerified === true, "User emailVerified marked true");
  assert(verifiedUser?.otpCode === null, "OTP code cleared from database to prevent replay");

  // 5. Session JWT Creation
  console.log("\n5. AUTHENTICATED SESSION ISSUANCE");
  const token = signJwt({
    userId: verifiedUser!.id,
    email: verifiedUser!.email,
    name: verifiedUser!.name,
    role: "USER",
    isVerified: verifiedUser!.isVerified,
  });

  const session = verifyJwt(token);
  assert(session?.userId === verifiedUser?.id, "Session JWT decoded and verified with correct user claims");
  assert(session?.role === "USER", "Session JWT carries correct role");

  console.log("\n=======================================================");
  console.log(`   Auth Bugfix Suite Results: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) process.exit(1);
}

runAuthFlowTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
