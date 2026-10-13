import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { checkUserLimits } from "@/lib/limits/istDate";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        profile: true,
        employeeRecord: true,
        blockedRecord: true,
      },
    });

    if (!user || user.isBlocked) {
      return NextResponse.json({ user: null, isBlocked: !!user?.isBlocked }, { status: 403 });
    }

    // Get current usage limits
    const limits = await checkUserLimits(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        preferredLanguage: user.preferredLanguage,
        profile: user.profile,
        employee: user.employeeRecord,
      },
      limits,
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Failed to retrieve session." }, { status: 500 });
  }
}
