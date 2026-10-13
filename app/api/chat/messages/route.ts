import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { checkUserLimits, incrementUserChatCount } from "@/lib/limits/istDate";
import { translateText } from "@/lib/translation/translator";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, content, targetLanguage } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required." }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    // Verify conversation existence
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: { select: { id: true, preferredLanguage: true } },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    // Access control:
    // If sender is normal user, they can only send to their own conversation
    if (session.role === "USER" && conversation.userId !== session.userId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Limits check for normal users
    if (session.role === "USER") {
      const limits = await checkUserLimits(session.userId);

      if (limits.isBlocked) {
        return NextResponse.json({ error: "Your account has been blocked." }, { status: 403 });
      }

      if (!limits.canSendChat) {
        return NextResponse.json(
          {
            error: "Daily chat limit reached.",
            message: `Daily chat limit reached (${limits.chatLimit} messages). Your limit will reset at 12:00 AM IST (in ${limits.resetIn}).`,
            resetIn: limits.resetIn,
            limitReached: true,
          },
          { status: 429 }
        );
      }

      // Increment daily chat usage
      await incrementUserChatCount(session.userId);
    }

    // Auto-translation handling if requested or between support & user
    let translatedContent: string | null = null;
    const recipientLang =
      targetLanguage ||
      (session.role === "USER" ? "en" : conversation.user.preferredLanguage || "en");

    if (recipientLang && recipientLang !== "en") {
      const translation = await translateText(content.trim(), recipientLang);
      translatedContent = translation.translatedText;
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: session.userId,
        senderRole: session.role,
        content: content.trim(),
        translatedContent,
        originalLanguage: "en",
        deliveryState: "DELIVERED",
        isRead: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true, isVerified: true },
        },
        attachments: true,
        audioMessage: true,
      },
    });

    // Touch conversation lastActivityAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Unable to send message. Please try again." }, { status: 500 });
  }
}
