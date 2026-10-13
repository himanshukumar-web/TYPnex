import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { logAuditAction } from "@/lib/audit/auditLogger";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || (session.role !== "ADMIN" && session.role !== "EMPLOYEE")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: "global",
          dailyChatLimit: 100,
          dailyFileLimit: 20,
          maxFileSizeMB: 20,
          adGateEnabled: true,
          adGateDurationSec: 5,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only administrators can modify system settings." }, { status: 403 });
    }

    const body = await req.json();
    const {
      dailyChatLimit,
      dailyFileLimit,
      maxFileSizeMB,
      allowedExtensions,
      adGateEnabled,
      adGateDurationSec,
      interstitialIntervalHours,
      maintenanceMode,
      announcementText,
    } = body;

    const updated = await prisma.systemSettings.upsert({
      where: { id: "global" },
      update: {
        dailyChatLimit: Number(dailyChatLimit) || 100,
        dailyFileLimit: Number(dailyFileLimit) || 20,
        maxFileSizeMB: Number(maxFileSizeMB) || 20,
        allowedExtensions: allowedExtensions || undefined,
        adGateEnabled: typeof adGateEnabled === "boolean" ? adGateEnabled : true,
        adGateDurationSec: Number(adGateDurationSec) || 5,
        interstitialIntervalHours: Number(interstitialIntervalHours) || 12,
        maintenanceMode: typeof maintenanceMode === "boolean" ? maintenanceMode : false,
        announcementText: announcementText ?? null,
      },
      create: {
        id: "global",
        dailyChatLimit: Number(dailyChatLimit) || 100,
        dailyFileLimit: Number(dailyFileLimit) || 20,
        maxFileSizeMB: Number(maxFileSizeMB) || 20,
        adGateEnabled: typeof adGateEnabled === "boolean" ? adGateEnabled : true,
        adGateDurationSec: Number(adGateDurationSec) || 5,
        interstitialIntervalHours: Number(interstitialIntervalHours) || 12,
        maintenanceMode: typeof maintenanceMode === "boolean" ? maintenanceMode : false,
        announcementText: announcementText ?? null,
      },
    });

    await logAuditAction({
      actorId: session.userId,
      actorEmail: session.email,
      action: "UPDATE_SYSTEM_SETTINGS",
      targetType: "SYSTEM",
      metadata: { settings: updated },
    });

    return NextResponse.json({
      success: true,
      settings: updated,
      message: "System settings saved successfully.",
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
