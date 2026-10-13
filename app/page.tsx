import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import AuthPage from "@/components/auth/AuthPage";

export default async function HomePage() {
  const session = await getSessionUser();

  if (session) {
    if (session.role === "ADMIN" || session.role === "EMPLOYEE") {
      redirect("/department");
    } else {
      redirect("/chat");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <AuthPage />
    </main>
  );
}
