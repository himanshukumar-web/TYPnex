import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { preferredLanguage, themePreference, notificationsEnabled } = body;

    const userUpdate: Record<string, unknown> = {};
    if (preferredLanguage) userUpdate.preferredLanguage = preferredLanguage;

    await prisma.user.update({
      where: { id: session.userId },
      data: userUpdate,
    });

    if (themePreference || typeof notificationsEnabled === "boolean") {
      await prisma.profile.upsert({
        where: { userId: session.userId },
        update: {
          themePreference: themePreference || undefined,
          notificationsEnabled: typeof notificationsEnabled === "boolean" ? notificationsEnabled : undefined,
        },
        create: {
          userId: session.userId,
          themePreference: themePreference || "light",
          notificationsEnabled: typeof notificationsEnabled === "boolean" ? notificationsEnabled : true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Preferences updated.",
      preferredLanguage,
    });
  } catch (error) {
    console.error("User settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
