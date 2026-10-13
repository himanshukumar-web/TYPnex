import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { logAuditAction } from "@/lib/audit/auditLogger";
import { checkUserLimits } from "@/lib/limits/istDate";

import { enforceRateLimit } from "@/lib/security/rateLimiter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, "ADMIN_API");
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getSessionUser();
    if (!session || (session.role !== "ADMIN" && session.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        blockedRecord: {
          include: { blockedBy: { select: { name: true, email: true } } },
        },
        dailyUsages: {
          orderBy: { dateKey: "desc" },
          take: 7,
        },
        _count: {
          select: { messagesSent: true, attachments: true, conversations: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const limits = await checkUserLimits(userId);

    return NextResponse.json({
      user,
      limits,
      stats: {
        totalMessages: user._count.messagesSent,
        totalFiles: user._count.attachments,
        totalConversations: user._count.conversations,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    return NextResponse.json({ error: "Failed to load user details." }, { status: 500 });
  }
}

// PATCH: Update verification (Blue Tick) or Block/Unblock
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== "ADMIN" && session.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await req.json();
    const { isVerified, isBlocked, blockReason } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Permission checks for Employees
    if (session.role === "EMPLOYEE") {
      const emp = await prisma.employee.findUnique({ where: { userId: session.userId } });
      if (isVerified !== undefined && !emp?.canVerifyUsers) {
        return NextResponse.json({ error: "Permission denied: Cannot modify verification" }, { status: 403 });
      }
      if (isBlocked !== undefined && !emp?.canBlockUsers) {
        return NextResponse.json({ error: "Permission denied: Cannot modify block status" }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};

    // 1. Blue Tick Verification Toggle
    if (typeof isVerified === "boolean") {
      updateData.isVerified = isVerified;
      await logAuditAction({
        actorId: session.userId,
        actorEmail: session.email,
        action: isVerified ? "VERIFY_USER" : "REMOVE_VERIFICATION",
        targetType: "USER",
        targetId: userId,
        metadata: { userName: targetUser.name, userEmail: targetUser.email },
      });
    }

    // 2. Block / Unblock Toggle
    if (typeof isBlocked === "boolean") {
      updateData.isBlocked = isBlocked;

      if (isBlocked) {
        await prisma.blockedUser.upsert({
          where: { userId },
          update: {
            reason: blockReason || "Administrative decision",
            blockedById: session.userId,
            blockedAt: new Date(),
          },
          create: {
            userId,
            blockedById: session.userId,
            reason: blockReason || "Administrative decision",
          },
        });

        await logAuditAction({
          actorId: session.userId,
          actorEmail: session.email,
          action: "BLOCK_USER",
          targetType: "USER",
          targetId: userId,
          metadata: { reason: blockReason, userName: targetUser.name },
        });
      } else {
        await prisma.blockedUser.deleteMany({
          where: { userId },
        });

        await logAuditAction({
          actorId: session.userId,
          actorEmail: session.email,
          action: "UNBLOCK_USER",
          targetType: "USER",
          targetId: userId,
          metadata: { userName: targetUser.name },
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        isBlocked: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${updatedUser.name} successfully updated.`,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user status." }, { status: 500 });
  }
}
