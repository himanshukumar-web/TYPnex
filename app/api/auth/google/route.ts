import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { signJwt } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { createDefaultUserConversations } from "@/lib/chat/defaultConversations";
import { ensureSystemSeeded } from "@/lib/seed";

export async function POST(req: NextRequest) {
  try {
    await ensureSystemSeeded();
    const body = await req.json();
    const { email, name, preferredLanguage } = body;

    if (!email || !name) {
      return NextResponse.json({ error: "Google account details required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { blockedRecord: true },
    });

    let isNewUser = false;

    if (user) {
      if (user.isBlocked) {
        return NextResponse.json(
          {
            error: "Your account has been blocked.",
            reason: user.blockedRecord?.reason,
            isBlocked: true,
          },
          { status: 403 }
        );
      }

      // If existing user didn't have verified email, mark verified
      if (!user.emailVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
          include: { blockedRecord: true },
        });
      }
    } else {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: name.trim(),
          passwordHash: "GOOGLE_OAUTH_ACCOUNT",
          emailVerified: true,
          preferredLanguage: preferredLanguage || "en",
          role: "USER",
          profile: {
            create: {
              themePreference: "light",
              notificationsEnabled: true,
            },
          },
        },
        include: { blockedRecord: true },
      });

      // Create the 3 default onboarding conversations
      await createDefaultUserConversations(user.id, user.name, user.preferredLanguage);
    }

    const token = signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "USER" | "EMPLOYEE" | "ADMIN",
      isVerified: user.isVerified,
    });

    const response = NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        preferredLanguage: user.preferredLanguage,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.json({ error: "Google authentication failed." }, { status: 500 });
  }
}
