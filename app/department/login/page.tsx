import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import DepartmentLoginPage from "@/components/auth/DepartmentLoginPage";

export default async function Page() {
  const session = await getSessionUser();

  if (session && (session.role === "ADMIN" || session.role === "EMPLOYEE")) {
    redirect("/department");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <DepartmentLoginPage />
    </main>
  );
}
