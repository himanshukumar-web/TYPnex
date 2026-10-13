import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, isVerified: true, role: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            attachments: true,
            audioMessage: true,
            sender: {
              select: { id: true, name: true, role: true, isVerified: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Role check:
    if (session.role === "USER" && conversation.userId !== session.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Mark messages as read if recipient is viewing
    if (session.role === "USER") {
      await prisma.message.updateMany({
        where: {
          conversationId: id,
          senderRole: { in: ["ADMIN", "EMPLOYEE"] },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
          deliveryState: "READ",
        },
      });
    } else {
      // Admin/Employee viewing user's messages
      await prisma.message.updateMany({
        where: {
          conversationId: id,
          senderRole: "USER",
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
          deliveryState: "READ",
        },
      });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json({ error: "Failed to load conversation." }, { status: 500 });
  }
}

// PATCH: Rename conversation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (session.role === "USER" && conversation.userId !== session.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title: title.trim() },
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    console.error("Rename conversation error:", error);
    return NextResponse.json({ error: "Failed to rename conversation." }, { status: 500 });
  }
}

// DELETE: Clear or delete conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (session.role === "USER" && conversation.userId !== session.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete messages inside conversation
    await prisma.message.deleteMany({
      where: { conversationId: id },
    });

    return NextResponse.json({ success: true, message: "Conversation cleared." });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json({ error: "Failed to delete conversation." }, { status: 500 });
  }
}
