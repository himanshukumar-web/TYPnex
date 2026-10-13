import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { validateFile, saveUploadedFile } from "@/lib/files/fileService";
import { checkUserLimits, incrementUserFileCount } from "@/lib/limits/istDate";
import { enforceRateLimit } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const rateLimitBlocked = enforceRateLimit(req, "FILE_UPLOAD");
    if (rateLimitBlocked) return rateLimitBlocked;

    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    const isAudio = formData.get("isAudio") === "true";
    const durationSeconds = parseFloat((formData.get("durationSeconds") as string) || "0");
    const isProtected = formData.get("protectedFromOwner") === "true" && (session.role === "ADMIN" || session.role === "EMPLOYEE");

    if (!file) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    // Strict Server-Side Validation: Video Rejection + Dangerous Executables + 20 MB Limit + MIME
    const validation = validateFile(file.name, file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
    }

    // Daily limit check for standard users
    if (session.role === "USER") {
      try {
        const limits = await checkUserLimits(session.userId);

        if (limits.isBlocked) {
          return NextResponse.json({ error: "Your account has been blocked." }, { status: 403 });
        }

        if (!limits.canSendFile) {
          return NextResponse.json(
            {
              error: "Daily file limit reached.",
              message: `Daily file limit reached (${limits.fileLimit} files). Your limit will reset at 12:00 AM IST (in ${limits.resetIn}).`,
              resetIn: limits.resetIn,
              limitReached: true,
            },
            { status: 429 }
          );
        }
      } catch {
        return NextResponse.json({ error: "User session not found." }, { status: 401 });
      }
    }

    // Verify conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    if (session.role === "USER" && conversation.userId !== session.userId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file securely to private object storage
    const saved = await saveUploadedFile(
      buffer,
      file.name,
      file.type,
      conversationId,
      session.userId,
      isProtected
    );

    // Create container Message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: session.userId,
        senderRole: session.role,
        content: isAudio ? `[Audio Message]` : `[Attachment: ${saved.filename}]`,
        deliveryState: "DELIVERED",
        attachments: {
          create: {
            userId: session.userId,
            filename: saved.filename,
            fileKey: saved.fileKey,
            storageKey: saved.storageKey,
            mimeType: saved.mimeType,
            sizeBytes: saved.sizeBytes,
            checksum: saved.checksum,
            url: saved.url,
            isAudio: isAudio || saved.isAudio,
            protectedFromOwner: isProtected,
          },
        },
        audioMessage: isAudio
          ? {
              create: {
                durationSeconds: durationSeconds || 5.0,
                audioUrl: saved.url,
              },
            }
          : undefined,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true, isVerified: true },
        },
        attachments: true,
        audioMessage: true,
      },
    });

    // Increment file limit count for standard users
    if (session.role === "USER") {
      await incrementUserFileCount(session.userId);
    }

    // Update conversation timestamp
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
      attachment: message.attachments[0],
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed. Retry." }, { status: 500 });
  }
}
