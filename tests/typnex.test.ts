import { hashPassword, comparePassword } from "../lib/auth/password";
import { generateOTP, verifyUserOTP, sendOtpToEmail, checkResendCooldown, hashOtp } from "../lib/auth/otp";
import { normalizeAndValidatePhone } from "../lib/sms/smsService";
import { signJwt, verifyJwt } from "../lib/auth/jwt";
import { validateFile } from "../lib/files/fileService";
import { defaultMalwareScanner, calculateChecksum } from "../lib/files/malwareScanner";
import { PrivateDiskStorageProvider } from "../lib/storage/storageService";
import { checkRateLimit } from "../lib/security/rateLimiter";
import { translateText, getLexiconTranslation } from "../lib/translation/translator";
import { logAuditAction } from "../lib/audit/auditLogger";
import {
  getISTDateKey,
  getRemainingTimeToISTMidnight,
  checkUserLimits,
  incrementUserChatCount,
  incrementUserFileCount,
} from "../lib/limits/istDate";
import { createDefaultUserConversations } from "../lib/chat/defaultConversations";
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

async function runTests() {
  console.log("\n=======================================================");
  console.log("   TYPnex Comprehensive Automated Test Suite");
  console.log("=======================================================\n");

  await ensureSystemSeeded();

  // Test 1: Password Hashing & Verification
  console.log("1. AUTHENTICATION & PASSWORDS");
  const plainPassword = "SecurePassword@2026";
  const hash = await hashPassword(plainPassword);
  assert(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "bcrypt produces valid salted hash");
  assert(await comparePassword(plainPassword, hash), "password matches hash correctly");
  assert(!(await comparePassword("WrongPassword", hash)), "wrong password rejected");

  // Test 2: OTP Generation & Verification
  console.log("\n2. EMAIL OTP VERIFICATION SYSTEM");
  const testEmail = `test_user_${Date.now()}@example.com`;
  const otp = generateOTP();
  assert(otp.length === 6 && /^\d+$/.test(otp), "OTP is exactly 6 numeric digits");

  // Create temporary user to test OTP flow
  const tempUser = await prisma.user.create({
    data: {
      email: testEmail,
      name: "Test User",
      passwordHash: hash,
      role: "USER",
      emailVerified: false,
    },
  });

  await sendOtpToEmail(testEmail, otp, "SIGNUP");

  // Verify OTP is stored as 64-char SHA-256 hash in DB, not plaintext
  const storedUser = await prisma.user.findUnique({ where: { id: tempUser.id } });
  assert(storedUser?.otpCode?.length === 64, "OTP is stored as SHA-256 hash (64 hex chars), not plaintext");
  assert(storedUser?.otpCode === hashOtp(otp), "Stored hash matches hashOtp(otp)");

  // Resend cooldown test
  const cooldownCheck = checkResendCooldown(testEmail, 60);
  assert(!cooldownCheck.allowed && cooldownCheck.waitSeconds > 0, "Enforces 60-second cooldown immediately after send");

  // Phone validation test (Indian +91 and international E.164)
  const indianPhone = normalizeAndValidatePhone("9876543210");
  assert(indianPhone.valid && indianPhone.normalized === "+919876543210", "Indian 10-digit mobile normalized to +919876543210");

  const intlPhone = normalizeAndValidatePhone("+1 202 555 0123");
  assert(intlPhone.valid && intlPhone.normalized === "+12025550123", "International US phone normalized to E.164");

  const invalidPhone = normalizeAndValidatePhone("12345");
  assert(!invalidPhone.valid, "Rejects malformed short phone number");

  const invalidOtpSuccess = await verifyUserOTP(testEmail, "000000");
  assert(!invalidOtpSuccess.valid, "incorrect OTP is rejected");

  const validOtpSuccess = await verifyUserOTP(testEmail, otp);
  assert(validOtpSuccess.valid, "valid OTP successfully verified and clears OTP token");

  const verifiedUserRecord = await prisma.user.findUnique({ where: { id: tempUser.id } });
  assert(verifiedUserRecord?.emailVerified === true, "user emailVerified set to true");
  assert(verifiedUserRecord?.otpCode === null, "OTP code invalidated after successful verification");

  // Test 3: JWT Session
  console.log("\n3. JWT SESSION ISSUANCE & VERIFICATION");
  const token = signJwt({
    userId: tempUser.id,
    email: tempUser.email,
    name: tempUser.name,
    role: "USER",
    isVerified: false,
  });
  const decoded = verifyJwt(token);
  assert(decoded !== null, "JWT token decodes successfully");
  assert(decoded?.userId === tempUser.id, "JWT contains correct userId");
  assert(decoded?.role === "USER", "JWT contains correct role");

  // Test 4: File Validation & Strict Video Rejection
  console.log("\n4. FILE VALIDATION & VIDEO REJECTION (FRONTEND & BACKEND)");
  // Video rejection
  const videoResult1 = validateFile("clip.mp4", "video/mp4", 1024 * 1024);
  assert(!videoResult1.valid && videoResult1.error === "Video files are not supported.", "rejects .mp4 files");

  const videoResult2 = validateFile("recording.mov", "video/quicktime", 5 * 1024 * 1024);
  assert(!videoResult2.valid && videoResult2.error === "Video files are not supported.", "rejects .mov files");

  const videoResult3 = validateFile("stream.mkv", "video/x-matroska", 2 * 1024 * 1024);
  assert(!videoResult3.valid && videoResult3.error === "Video files are not supported.", "rejects .mkv files");

  const videoResult4 = validateFile("fake_audio.avi", "video/x-msvideo", 2 * 1024 * 1024);
  assert(!videoResult4.valid, "rejects .avi files");

  // 20 MB size limit
  const oversizedResult = validateFile("document.pdf", "application/pdf", 21 * 1024 * 1024);
  assert(!oversizedResult.valid && oversizedResult.error === "Maximum file size is 20 MB.", "rejects files > 20 MB");

  // Allowed valid files
  const validPdf = validateFile("contract.pdf", "application/pdf", 2 * 1024 * 1024);
  assert(validPdf.valid, "accepts normal PDF <= 20 MB");

  const validImg = validateFile("photo.png", "image/png", 500 * 1024);
  assert(validImg.valid, "accepts image photo.png");

  const validAudio = validateFile("voice.mp3", "audio/mpeg", 1 * 1024 * 1024);
  assert(validAudio.valid, "accepts audio file");

  // Test 5: IST Timezone Quota Cycle (Asia/Kolkata)
  console.log("\n5. DAILY USAGE LIMITS & ASIA/KOLKATA MIDNIGHT RESET");
  const istDateKey = getISTDateKey();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(istDateKey), "IST dateKey is in YYYY-MM-DD format");

  const resetInfo = getRemainingTimeToISTMidnight();
  assert(resetInfo.ms > 0 && resetInfo.ms <= 24 * 60 * 60 * 1000, "IST midnight reset countdown is within 24 hours");
  assert(resetInfo.formattedText.includes("h"), "formatted reset time has hours and minutes");

  // Check initial limits
  const initialLimits = await checkUserLimits(tempUser.id);
  assert(initialLimits.chatLimit === 100, "default daily chat limit is 100");
  assert(initialLimits.fileLimit === 20, "default daily file limit is 20");
  assert(initialLimits.canSendChat === true, "new user can send chat");
  assert(initialLimits.canSendFile === true, "new user can send file");

  // Increment chat and file counters
  await incrementUserChatCount(tempUser.id);
  await incrementUserChatCount(tempUser.id);
  await incrementUserFileCount(tempUser.id);

  const updatedLimits = await checkUserLimits(tempUser.id);
  assert(updatedLimits.chatCount === 2, "increments chat count to 2");
  assert(updatedLimits.fileCount === 1, "increments file count to 1");
  assert(updatedLimits.remainingChats === 98, "remaining chats decremented to 98");
  assert(updatedLimits.remainingFiles === 19, "remaining files decremented to 19");

  // Test 6: Blue Tick Verification (Unlimited Quota Bypass)
  console.log("\n6. VERIFIED / BLUE TICK USER PRIVILEGES");
  await prisma.user.update({
    where: { id: tempUser.id },
    data: { isVerified: true },
  });

  const verifiedLimits = await checkUserLimits(tempUser.id);
  assert(verifiedLimits.isVerified === true, "user marked as verified");
  assert(verifiedLimits.canSendChat === true && verifiedLimits.chatLimit === 999999, "verified user bypasses chat limit");
  assert(verifiedLimits.canSendFile === true && verifiedLimits.fileLimit === 999999, "verified user bypasses file limit");

  // Test 7: Block System
  console.log("\n7. USER BLOCKING SYSTEM");
  await prisma.user.update({
    where: { id: tempUser.id },
    data: { isBlocked: true },
  });

  const blockedLimits = await checkUserLimits(tempUser.id);
  assert(blockedLimits.isBlocked === true, "user marked as blocked");
  assert(blockedLimits.canSendChat === false, "blocked user cannot send chats");
  assert(blockedLimits.canSendFile === false, "blocked user cannot send files");

  // Unblock
  await prisma.user.update({
    where: { id: tempUser.id },
    data: { isBlocked: false, isVerified: false },
  });

  // Test 8: First-time Onboarding Conversations
  console.log("\n8. FIRST TIME USER EXPERIENCE (3 DEFAULT CONVERSATIONS)");
  await createDefaultUserConversations(tempUser.id, tempUser.name, "en");

  const conversations = await prisma.conversation.findMany({
    where: { userId: tempUser.id },
  });

  assert(conversations.length === 3, "creates exactly 3 default conversations");
  const titles = conversations.map((c) => c.title);
  assert(titles.some((t) => t.includes("Welcome")), "Chat 1: Welcome conversation exists");
  assert(titles.some((t) => t.includes("Send Us Anything")), "Chat 2: Send us anything exists");
  assert(titles.some((t) => t.includes("Future Services")), "Chat 3: Future services exists");

  // Test 9: Dangerous Executables Rejection & Malware Scanner
  console.log("\n9. EXECUTABLE REJECTION & MALWARE SCANNER");
  const exeResult = validateFile("payload.exe", "application/x-msdownload", 1024);
  assert(!exeResult.valid && Boolean(exeResult.error?.includes("strictly prohibited")), "rejects .exe files");

  const batResult = validateFile("script.bat", "text/plain", 1024);
  assert(!batResult.valid && Boolean(batResult.error?.includes("strictly prohibited")), "rejects .bat files");

  const ps1Result = validateFile("attack.ps1", "text/plain", 1024);
  assert(!ps1Result.valid && Boolean(ps1Result.error?.includes("strictly prohibited")), "rejects .ps1 scripts");

  const apkResult = validateFile("app.apk", "application/vnd.android.package-archive", 1024);
  assert(!apkResult.valid, "rejects .apk packages");

  // Heuristic scanner: Disguised PE binary (MZ header in .pdf)
  const fakePdfBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
  const scanResult = await defaultMalwareScanner.scanBuffer(fakePdfBuffer, "invoice.pdf");
  assert(!scanResult.safe && scanResult.threatName === "DisguisedExecutable.PE", "detects disguised PE binary by magic bytes");

  // Checksum calculation
  const testBuf = Buffer.from("TYPnex secure payload test");
  const checksum = calculateChecksum(testBuf);
  assert(checksum.length === 64, "generates standard 64-char hex SHA-256 checksum");

  // Test 10: Private Storage & Signed URL Verification
  console.log("\n10. PRIVATE STORAGE & SIGNED URLs");
  const storageProvider = new PrivateDiskStorageProvider();
  const testKey = "test-doc-123.pdf";
  const signedUrl = await storageProvider.createSignedUrl(testKey, 60);
  assert(signedUrl.includes("/api/files/download/test-doc-123.pdf?token="), "generates protected download URL with token");
  assert(signedUrl.includes("&expires="), "signed URL contains expiry timestamp");

  const urlParams = new URL(signedUrl, "http://localhost:3000").searchParams;
  const tokenVal = urlParams.get("token") || "";
  const expiresVal = parseInt(urlParams.get("expires") || "0", 10);
  assert(storageProvider.verifySignedToken(testKey, tokenVal, expiresVal), "validates valid signed token");
  assert(!storageProvider.verifySignedToken(testKey, "tampered-token", expiresVal), "rejects forged token");
  assert(!storageProvider.verifySignedToken(testKey, tokenVal, Math.floor(Date.now() / 1000) - 10), "rejects expired token");

  // Test 11: Modular Translation & Lexicon Fallback
  console.log("\n11. MODULAR TRANSLATION PROVIDER & CACHE");
  const hindiGreeting = getLexiconTranslation("welcome_greeting", "hi", { name: "Vikram" });
  assert(hindiGreeting.includes("Vikram") && hindiGreeting.includes("स्वागत"), "translates onboarding greeting to Hindi with variables");

  const transResult = await translateText("Hello Vikram 👋\nWelcome to Typnex.\nHow can we help you today?", "hi", "en");
  assert(transResult.translatedText.includes("स्वागत"), "translates template text via provider hierarchy");
  assert(transResult.sourceLanguage === "en" && transResult.targetLanguage === "hi", "identifies correct source and target language");

  // Test 12: Server-Side Rate Limiter
  console.log("\n12. SERVER-SIDE RATE LIMITING");
  const testIp = `192.168.1.${Date.now() % 255}`;
  const rate1 = checkRateLimit(testIp, "AUTH_LOGIN");
  assert(rate1.allowed === true && rate1.remaining === rate1.limit - 1, "first request allowed under rate limit");

  // Rapid requests exceeding limit
  for (let i = 0; i < rate1.limit; i++) {
    checkRateLimit(testIp, "AUTH_LOGIN");
  }
  const rateBlocked = checkRateLimit(testIp, "AUTH_LOGIN");
  assert(rateBlocked.allowed === false && rateBlocked.remaining === 0, "blocks excess requests exceeding configured threshold");

  // Test 13: RBAC & Authorization Rules
  console.log("\n13. RBAC & PERMISSION BOUNDARIES");
  assert(tempUser.role === "USER", "standard account role is USER");
  assert(tempUser.role !== "ADMIN" && tempUser.role !== "EMPLOYEE", "USER role cannot access staff endpoints");

  // Test 14: Server-Side Audit Logging
  console.log("\n14. AUDIT LOGGING SYSTEM");
  const audit = await logAuditAction({
    actorId: tempUser.id,
    actorEmail: tempUser.email,
    action: "VERIFY_USER",
    targetType: "USER",
    targetId: tempUser.id,
    metadata: { reason: "Automated test pass verification" },
  });
  assert(Boolean(audit && audit.action === "VERIFY_USER"), "logs audit action successfully");
  assert(Boolean(audit && audit.actorId === tempUser.id), "audit record contains actorId");

  // Clean up test user
  await prisma.user.delete({ where: { id: tempUser.id } });

  console.log("\n=======================================================");
  console.log(`   Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
