import prisma from "@/lib/db";

/**
 * Returns the current date in Asia/Kolkata timezone formatted as YYYY-MM-DD
 */
export function getISTDateKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // e.g. "2026-10-06"
}

/**
 * Calculates remaining time in milliseconds until next 00:00:00 IST
 */
export function getRemainingTimeToISTMidnight(): {
  ms: number;
  hours: number;
  minutes: number;
  formattedText: string;
} {
  const now = new Date();
  
  // Current time in IST offset (+05:30 = 330 minutes)
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istNowMs = now.getTime() + istOffsetMs;

  // Next midnight in UTC representation of IST
  const nextMidnightIST = new Date(istNowMs);
  nextMidnightIST.setUTCHours(24, 0, 0, 0);

  const diffMs = Math.max(0, nextMidnightIST.getTime() - istNowMs);
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const formattedText = `${hours}h ${minutes}m`;

  return {
    ms: diffMs,
    hours,
    minutes,
    formattedText,
  };
}

export interface UserLimitStatus {
  isVerified: boolean;
  isBlocked: boolean;
  dateKey: string;
  chatCount: number;
  chatLimit: number;
  remainingChats: number;
  canSendChat: boolean;
  fileCount: number;
  fileLimit: number;
  remainingFiles: number;
  canSendFile: boolean;
  resetIn: string;
  resetHours: number;
  resetMinutes: number;
}

/**
 * Checks the user's daily usage limits for today (IST cycle).
 * Verified users bypass normal chat and file limits!
 */
export async function checkUserLimits(userId: string): Promise<UserLimitStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isVerified: true,
      isBlocked: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Admin and Employee roles have no usage restrictions
  const isAdminOrEmployee = user.role === "ADMIN" || user.role === "EMPLOYEE";

  // Fetch global settings
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
      },
    });
  }

  const dateKey = getISTDateKey();
  const resetInfo = getRemainingTimeToISTMidnight();

  // If user is verified (Blue Tick) or admin/employee, they have unlimited quotas
  if (user.isVerified || isAdminOrEmployee) {
    return {
      isVerified: user.isVerified || isAdminOrEmployee,
      isBlocked: user.isBlocked,
      dateKey,
      chatCount: 0,
      chatLimit: 999999,
      remainingChats: 999999,
      canSendChat: !user.isBlocked,
      fileCount: 0,
      fileLimit: 999999,
      remainingFiles: 999999,
      canSendFile: !user.isBlocked,
      resetIn: resetInfo.formattedText,
      resetHours: resetInfo.hours,
      resetMinutes: resetInfo.minutes,
    };
  }

  // Get or initialize today's daily usage
  const usage = await prisma.dailyUsage.findUnique({
    where: {
      userId_dateKey: {
        userId,
        dateKey,
      },
    },
  });

  const chatCount = usage?.chatCount ?? 0;
  const fileCount = usage?.fileCount ?? 0;
  const chatLimit = settings.dailyChatLimit;
  const fileLimit = settings.dailyFileLimit;

  const canSendChat = !user.isBlocked && chatCount < chatLimit;
  const canSendFile = !user.isBlocked && fileCount < fileLimit;

  return {
    isVerified: false,
    isBlocked: user.isBlocked,
    dateKey,
    chatCount,
    chatLimit,
    remainingChats: Math.max(0, chatLimit - chatCount),
    canSendChat,
    fileCount,
    fileLimit,
    remainingFiles: Math.max(0, fileLimit - fileCount),
    canSendFile,
    resetIn: resetInfo.formattedText,
    resetHours: resetInfo.hours,
    resetMinutes: resetInfo.minutes,
  };
}

/**
 * Increments chat count for the user for the current IST date
 */
export async function incrementUserChatCount(userId: string): Promise<void> {
  const dateKey = getISTDateKey();
  await prisma.dailyUsage.upsert({
    where: {
      userId_dateKey: {
        userId,
        dateKey,
      },
    },
    update: {
      chatCount: { increment: 1 },
      lastActionAt: new Date(),
    },
    create: {
      userId,
      dateKey,
      chatCount: 1,
      fileCount: 0,
      lastActionAt: new Date(),
    },
  });
}

/**
 * Increments file count for the user for the current IST date
 */
export async function incrementUserFileCount(userId: string): Promise<void> {
  const dateKey = getISTDateKey();
  await prisma.dailyUsage.upsert({
    where: {
      userId_dateKey: {
        userId,
        dateKey,
      },
    },
    update: {
      fileCount: { increment: 1 },
      lastActionAt: new Date(),
    },
    create: {
      userId,
      dateKey,
      chatCount: 0,
      fileCount: 1,
      lastActionAt: new Date(),
    },
  });
}
