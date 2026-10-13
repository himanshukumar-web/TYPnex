import prisma from "./db";
import { hashPassword } from "./auth/password";

export async function ensureSystemSeeded() {
  // 1. Ensure System Settings exist
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "global" },
  });

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        id: "global",
        dailyChatLimit: 100,
        dailyFileLimit: 20,
        maxFileSizeMB: 20,
        allowedExtensions: "png,jpg,jpeg,gif,webp,svg,pdf,doc,docx,txt,csv,xlsx,ppt,pptx,zip,rar,mp3,wav,ogg,m4a",
        disallowedExtensions: "mp4,mov,avi,mkv,webm,3gp,flv,wmv",
        adGateEnabled: true,
        adGateDurationSec: 5,
        interstitialIntervalHours: 12,
        maintenanceMode: false,
      },
    });
    console.log("[TYPnex DB] Initialized global system settings.");
  }

  // 2. Ensure Official Admin exists
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@typnex.com";
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || "AdminPass@2026";
    const passwordHash = await hashPassword(adminPass);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "Typnex Administrator",
        role: "ADMIN",
        isVerified: true,
        emailVerified: true,
        preferredLanguage: "en",
        profile: {
          create: {
            bio: "Head of Operations at Typnex",
            themePreference: "light",
          },
        },
      },
    });
    console.log(`[TYPnex DB] Created default admin account: ${adminEmail}`);
  }

  // 3. Ensure Official Support Account exists
  const supportEmail = "support@typnex.com";
  let support = await prisma.user.findUnique({
    where: { email: supportEmail },
  });

  if (!support) {
    const supportPass = process.env.DEFAULT_SUPPORT_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || "SupportPass@2026";
    const supportHash = await hashPassword(supportPass);
    support = await prisma.user.create({
      data: {
        email: supportEmail,
        passwordHash: supportHash,
        name: "Typnex Support Desk",
        role: "ADMIN",
        isVerified: true,
        emailVerified: true,
        preferredLanguage: "en",
      },
    });
  }

  // 4. Ensure Default Employee exists
  const employeeEmail = process.env.DEFAULT_EMPLOYEE_EMAIL || "employee@typnex.com";
  let employeeUser = await prisma.user.findUnique({
    where: { email: employeeEmail },
  });

  if (!employeeUser) {
    const empPass = process.env.DEFAULT_EMPLOYEE_PASSWORD || "EmployeePass@2026";
    const empHash = await hashPassword(empPass);
    employeeUser = await prisma.user.create({
      data: {
        email: employeeEmail,
        passwordHash: empHash,
        name: "Alex Support Lead",
        role: "EMPLOYEE",
        isVerified: true,
        emailVerified: true,
        preferredLanguage: "en",
        employeeRecord: {
          create: {
            department: "Client Services",
            canVerifyUsers: true,
            canBlockUsers: false,
            canDeleteMessages: true,
            canViewAnalytics: true,
          },
        },
      },
    });
    console.log(`[TYPnex DB] Created default employee account: ${employeeEmail}`);
  }

  return { settings, admin, employeeUser };
}
