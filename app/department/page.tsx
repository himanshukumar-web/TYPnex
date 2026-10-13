import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export default async function DepartmentPage() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/department/login");
  }

  if (session.role === "USER") {
    redirect("/chat");
  }

  const staff = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      employeeRecord: true,
    },
  });

  if (!staff) {
    redirect("/department/login");
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      <AdminWorkspace
        currentUser={{
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role as "ADMIN" | "EMPLOYEE",
          department: staff.employeeRecord?.department || "Operations",
          permissions: staff.employeeRecord
            ? {
                canVerifyUsers: staff.employeeRecord.canVerifyUsers,
                canBlockUsers: staff.employeeRecord.canBlockUsers,
                canDeleteMessages: staff.employeeRecord.canDeleteMessages,
                canViewAnalytics: staff.employeeRecord.canViewAnalytics,
              }
            : null,
        }}
      />
    </main>
  );
}
