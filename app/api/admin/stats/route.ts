import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { getISTDateKey } from "@/lib/limits/istDate";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== "ADMIN" && session.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const todayDateKey = getISTDateKey();

    // 1. Total users (customers)
    const totalUsers = await prisma.user.count({ where: { role: "USER" } });

    // 2. Blocked users
    const blockedUsers = await prisma.user.count({ where: { role: "USER", isBlocked: true } });

    // 3. Verified users (Blue tick)
    const verifiedUsers = await prisma.user.count({ where: { role: "USER", isVerified: true } });

    // 4. Employees count
    const employeeCount = await prisma.user.count({ where: { role: "EMPLOYEE" } });

    // 5. Today's active usage
    const todayUsages = await prisma.dailyUsage.findMany({
      where: { dateKey: todayDateKey },
    });

    const activeUsersToday = todayUsages.length;
    const messagesToday = todayUsages.reduce((acc, u) => acc + u.chatCount, 0);
    const filesToday = todayUsages.reduce((acc, u) => acc + u.fileCount, 0);

    // 6. Total messages & files
    const totalMessages = await prisma.message.count();
    const totalFiles = await prisma.attachment.count();

    // 7. Storage usage (sum of sizeBytes)
    const storageAggregate = await prisma.attachment.aggregate({
      _sum: { sizeBytes: true },
    });
    const totalStorageBytes = storageAggregate._sum.sizeBytes || 0;
    const storageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);

    // 8. 7-day trend chart data
    const recentUsages = await prisma.dailyUsage.findMany({
      orderBy: { dateKey: "asc" },
      take: 50,
    });

    const usageByDate: Record<string, { date: string; messages: number; files: number; activeUsers: number }> = {};
    for (const u of recentUsages) {
      if (!usageByDate[u.dateKey]) {
        usageByDate[u.dateKey] = { date: u.dateKey, messages: 0, files: 0, activeUsers: 0 };
      }
      usageByDate[u.dateKey].messages += u.chatCount;
      usageByDate[u.dateKey].files += u.fileCount;
      usageByDate[u.dateKey].activeUsers += 1;
    }

    const chartData = Object.values(usageByDate).slice(-7);

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeUsersToday,
        messagesToday,
        filesToday,
        blockedUsers,
        verifiedUsers,
        totalMessages,
        totalFiles,
        storageMB: `${storageMB} MB`,
        totalStorageBytes,
        employeeCount,
      },
      chartData,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to retrieve statistics." }, { status: 500 });
  }
}
