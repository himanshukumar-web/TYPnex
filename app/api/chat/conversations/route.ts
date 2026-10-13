import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";

// GET: List conversations
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");

    // Access control:
    // Regular users can only access their own conversations!
    // Admin and Employee can access customer conversations.
    let targetUserId = session.userId;
    if (requestedUserId) {
      if (session.role !== "ADMIN" && session.role !== "EMPLOYEE") {
        return NextResponse.json({ error: "Forbidden: Users cannot access other users' conversations" }, { status: 403 });
      }
      targetUserId = requestedUserId;
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: targetUserId,
        status: "ACTIVE",
      },
      orderBy: [
        { isPinned: "desc" },
        { lastActivityAt: "desc" },
      ],
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            attachments: true,
          },
        },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("List conversations error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations." }, { status: 500 });
  }
}

// POST: Create a new conversation (with auto-save of current state)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = (body.title || `Chat ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`).trim();

    // Check if user is blocked
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isBlocked: true },
    });

    if (user?.isBlocked) {
      return NextResponse.json({ error: "Your account is blocked. Cannot create new chat." }, { status: 403 });
    }

    // Auto-save existing conversations: touch their lastActivityAt
    await prisma.conversation.updateMany({
      where: { userId: session.userId },
      data: { updatedAt: new Date() },
    });

    // Create fresh conversation
    const newConv = await prisma.conversation.create({
      data: {
        userId: session.userId,
        title,
        status: "ACTIVE",
        lastActivityAt: new Date(),
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ success: true, conversation: newConv });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json({ error: "Failed to create conversation." }, { status: 500 });
  }
}
