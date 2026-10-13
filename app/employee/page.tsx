import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import EmployeeWorkspace from "@/components/employee/EmployeeWorkspace";

export default async function EmployeePage() {
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
      <EmployeeWorkspace
        currentUser={{
          id: staff.id,
          name: staff.name,
          email: staff.email,
          department: staff.employeeRecord?.department || "Support Operations",
          canManageAll: staff.role === "ADMIN",
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
