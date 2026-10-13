import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { comparePassword } from "@/lib/auth/password";
import { signJwt } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { ensureSystemSeeded } from "@/lib/seed";
import { logAuditAction } from "@/lib/audit/auditLogger";

export async function POST(req: NextRequest) {
  try {
    await ensureSystemSeeded();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Department credentials required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { employeeRecord: true, blockedRecord: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid department credentials." }, { status: 401 });
    }

    // Role check: Only ADMIN and EMPLOYEE allowed in Department login
    if (user.role !== "ADMIN" && user.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Access denied. Only authorized department staff may log in here." }, { status: 403 });
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: "Department access suspended for this account." }, { status: 403 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid department credentials." }, { status: 401 });
    }

    const token = signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "EMPLOYEE" | "ADMIN",
      isVerified: true,
    });

    // Log admin / staff login in audit trail
    await logAuditAction({
      actorId: user.id,
      actorEmail: user.email,
      action: "UPDATE_SYSTEM_SETTINGS",
      targetType: "SYSTEM",
      metadata: { event: "DEPARTMENT_STAFF_LOGIN", role: user.role },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        department: user.employeeRecord?.department || "Operations",
        permissions: user.employeeRecord || null,
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
    console.error("Department login error:", error);
    return NextResponse.json({ error: "Department authentication failure." }, { status: 500 });
  }
}
