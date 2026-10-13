import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { storageService } from "@/lib/storage/storageService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileKey } = await params;
    const { searchParams } = new URL(req.url);
    const adGateCompleted = searchParams.get("adGateCompleted") === "true";

    // Lookup attachment metadata from database
    const attachment = await prisma.attachment.findFirst({
      where: {
        fileKey,
        deletedAt: null,
      },
      include: {
        message: {
          include: { conversation: true },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const convUserId = attachment.message.conversation.userId;

    // RBAC Enforcement:
    // USER: Can ONLY access attachments belonging to their own conversations
    if (session.role === "USER" && convUserId !== session.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // EMPLOYEE: Check assignment permissions
    if (session.role === "EMPLOYEE") {
      const assignment = await prisma.employeeAssignment.findFirst({
        where: {
          employee: { userId: session.userId },
          customerId: convUserId,
        },
      });

      const totalAssignments = await prisma.employeeAssignment.count({
        where: { employee: { userId: session.userId } },
      });

      // If this employee has specific customer assignments and this customer is not one of them
      if (totalAssignments > 0 && !assignment) {
        return NextResponse.json({ error: "Access denied: User not assigned to employee." }, { status: 403 });
      }
    }

    // Check Owner-Protection / Sponsored Ad Gate for regular users
    if (attachment.protectedFromOwner && session.role === "USER" && !adGateCompleted) {
      const settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
      if (settings?.adGateEnabled) {
        return NextResponse.json(
          {
            requiresAdGate: true,
            durationSec: settings.adGateDurationSec || 5,
            fileKey,
            filename: attachment.filename,
            message: "Sponsored access required for this official Typnex document.",
          },
          { status: 402 } // Payment / ad-gate required status
        );
      }
    }

    // Storage key resolution
    const effectiveStorageKey =
      attachment.storageKey ||
      `conversations/${attachment.message.conversationId}/${fileKey}`;

    // Securely retrieve file from private object storage
    try {
      const fileBuffer = await storageService.download(effectiveStorageKey);

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          "Content-Type": attachment.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
          "Content-Length": fileBuffer.length.toString(),
          "Cache-Control": "private, no-transform, max-age=300",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      });
    } catch (storageErr) {
      console.error("Storage download failure:", storageErr);
      return NextResponse.json({ error: "File could not be retrieved from private storage." }, { status: 404 });
    }
  } catch (error) {
    console.error("File download handler error:", error);
    return NextResponse.json({ error: "Failed to process download request." }, { status: 500 });
  }
}
