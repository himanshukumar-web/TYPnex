import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";

export async function POST() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all conversations and messages for current user
    await prisma.conversation.deleteMany({
      where: { userId: session.userId },
    });

    // Recreate a clean blank conversation so user is never left without an active chat
    const fresh = await prisma.conversation.create({
      data: {
        userId: session.userId,
        title: "New Support Chat",
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, conversation: fresh });
  } catch (error) {
    console.error("Clear all error:", error);
    return NextResponse.json({ error: "Failed to clear all conversations." }, { status: 500 });
  }
}
