import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const since = searchParams.get("since");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Security: user can only sync own conversations
    if (session.role === "USER" && conversation.userId !== session.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30000);

    const newMessages = await prisma.message.findMany({
      where: {
        conversationId,
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, role: true, isVerified: true } },
        attachments: true,
        audioMessage: true,
      },
    });

    // Automatically update delivery / read states for recipient
    if (newMessages.length > 0) {
      const otherUserMessages = newMessages
        .filter((m) => m.senderId !== session.userId)
        .map((m) => m.id);

      if (otherUserMessages.length > 0) {
        await prisma.message.updateMany({
          where: { id: { in: otherUserMessages } },
          data: {
            deliveryState: "READ",
            isRead: true,
            readAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      messages: newMessages,
      serverTime: new Date().toISOString(),
      presence: {
        isSupportOnline: true,
        typing: false,
      },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
