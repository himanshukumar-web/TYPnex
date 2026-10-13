import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";

import { enforceRateLimit } from "@/lib/security/rateLimiter";

export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, "ADMIN_API");
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getSessionUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // "all", "verified", "blocked"

    // Base query for customers
    const whereClause: Record<string, unknown> = {
      role: "USER",
    };

    if (search.trim()) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (filter === "verified") {
      whereClause.isVerified = true;
    } else if (filter === "blocked") {
      whereClause.isBlocked = true;
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
        blockedRecord: {
          select: { reason: true, blockedAt: true, blockedBy: { select: { name: true } } },
        },
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

    // Map users with formatted last message and activity
    const formattedUsers = users.map((u) => {
      const activeConv = u.conversations[0];
      const lastMsg = activeConv?.messages[0];
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        isVerified: u.isVerified,
        isBlocked: u.isBlocked,
        blockReason: u.blockedRecord?.reason,
        preferredLanguage: u.preferredLanguage,
        createdAt: u.createdAt,
        conversationId: activeConv?.id || null,
        lastMessage: lastMsg ? lastMsg.content : "No messages yet",
        lastActivityAt: activeConv?.lastActivityAt || u.createdAt,
        hasUnread: lastMsg ? !lastMsg.isRead && lastMsg.senderRole === "USER" : false,
      };
    });

    // Sort users by most recent activity at the top
    formattedUsers.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Admin list users error:", error);
    return NextResponse.json({ error: "Failed to list users." }, { status: 500 });
  }
}
