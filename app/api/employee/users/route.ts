import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { enforceRateLimit } from "@/lib/security/rateLimiter";

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, "DEFAULT");
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getSessionUser();
    if (!session || (session.role !== "EMPLOYEE" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized: Employee access only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    // If Employee role, find assigned customer IDs
    let allowedUserIds: string[] | null = null;

    if (session.role === "EMPLOYEE") {
      const empRecord = await prisma.employee.findUnique({
        where: { userId: session.userId },
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            select: { customerId: true },
          },
        },
      });

      if (!empRecord) {
        return NextResponse.json({ error: "Employee record not found" }, { status: 403 });
      }

      // Employees with assignments only see their assigned customers
      if (empRecord.assignments && empRecord.assignments.length > 0) {
        allowedUserIds = empRecord.assignments.map((a: { customerId: string }) => a.customerId);
      }
    }

    const whereClause: Record<string, unknown> = {
      role: "USER",
      deletedAt: null,
    };

    if (allowedUserIds !== null) {
      whereClause.id = { in: allowedUserIds };
    }

    if (search.trim()) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        isBlocked: true,
        preferredLanguage: true,
        createdAt: true,
        conversations: {
          orderBy: { lastActivityAt: "desc" },
          take: 1,
          select: {
            id: true,
            title: true,
            lastActivityAt: true,
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                content: true,
                createdAt: true,
                senderRole: true,
                isRead: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = users.map((u) => {
      const activeConv = u.conversations[0];
      const latestMsg = activeConv?.messages[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        isVerified: u.isVerified,
        isBlocked: u.isBlocked,
        preferredLanguage: u.preferredLanguage,
        conversationId: activeConv?.id || null,
        lastMessage: latestMsg?.content || "No messages yet",
        lastActivityAt: activeConv?.lastActivityAt?.toISOString() || u.createdAt.toISOString(),
        hasUnread: latestMsg ? !latestMsg.isRead && latestMsg.senderRole === "USER" : false,
      };
    });

    return NextResponse.json({ users: formatted });
  } catch (error) {
    console.error("Employee fetch users error:", error);
    return NextResponse.json({ error: "Failed to load assigned users." }, { status: 500 });
  }
}
