import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { logAuditAction } from "@/lib/audit/auditLogger";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      include: {
        employeeRecord: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error("List employees error:", error);
    return NextResponse.json({ error: "Failed to load employees" }, { status: 500 });
  }
}

// POST: Add new employee
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, department, canVerifyUsers, canBlockUsers, canDeleteMessages, canViewAnalytics } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and temporary password required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newEmployee = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: "EMPLOYEE",
        isVerified: true,
        emailVerified: true,
        employeeRecord: {
          create: {
            department: department || "Customer Support",
            canVerifyUsers: !!canVerifyUsers,
            canBlockUsers: !!canBlockUsers,
            canDeleteMessages: !!canDeleteMessages,
            canViewAnalytics: !!canViewAnalytics,
          },
        },
      },
      include: { employeeRecord: true },
    });

    await logAuditAction({
      actorId: session.userId,
      actorEmail: session.email,
      action: "UPDATE_EMPLOYEE_PERMISSIONS",
      targetType: "EMPLOYEE",
      targetId: newEmployee.id,
      metadata: { createdEmployeeEmail: cleanEmail },
    });

    return NextResponse.json({ success: true, employee: newEmployee });
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

// PATCH: Update employee permissions
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, department, canVerifyUsers, canBlockUsers, canDeleteMessages, canViewAnalytics } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID required." }, { status: 400 });
    }

    const updated = await prisma.employee.upsert({
      where: { userId: employeeId },
      update: {
        department: department || undefined,
        canVerifyUsers: typeof canVerifyUsers === "boolean" ? canVerifyUsers : undefined,
        canBlockUsers: typeof canBlockUsers === "boolean" ? canBlockUsers : undefined,
        canDeleteMessages: typeof canDeleteMessages === "boolean" ? canDeleteMessages : undefined,
        canViewAnalytics: typeof canViewAnalytics === "boolean" ? canViewAnalytics : undefined,
      },
      create: {
        userId: employeeId,
        department: department || "Customer Support",
        canVerifyUsers: !!canVerifyUsers,
        canBlockUsers: !!canBlockUsers,
        canDeleteMessages: !!canDeleteMessages,
        canViewAnalytics: !!canViewAnalytics,
      },
    });

    await logAuditAction({
      actorId: session.userId,
      actorEmail: session.email,
      action: "UPDATE_EMPLOYEE_PERMISSIONS",
      targetType: "EMPLOYEE",
      targetId: employeeId,
      metadata: { permissions: updated },
    });

    return NextResponse.json({ success: true, permissions: updated });
  } catch (error) {
    console.error("Update employee permissions error:", error);
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 });
  }
}
