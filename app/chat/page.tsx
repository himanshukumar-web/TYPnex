import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/db";
import { checkUserLimits } from "@/lib/limits/istDate";
import { createDefaultUserConversations } from "@/lib/chat/defaultConversations";
import UserChatDashboard from "@/components/chat/UserChatDashboard";
import { AlertTriangle, LogOut } from "lucide-react";

export default async function ChatPage() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "ADMIN" || session.role === "EMPLOYEE") {
    redirect("/department");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      profile: true,
      blockedRecord: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  // Blocked account screen
  if (user.isBlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl shadow-2xl border border-rose-500/30 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Your Account Has Been Blocked
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
            Reason: <span className="font-semibold">{user.blockedRecord?.reason || "Administrative policy enforcement."}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Blocked accounts cannot send messages, exchange files, or access protected Typnex services.
          </p>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Ensure 3 default onboarding conversations exist
  await createDefaultUserConversations(user.id, user.name, user.preferredLanguage || "en");

  // Load limits and conversations
  const limits = await checkUserLimits(user.id);

  const dbConversations = await prisma.conversation.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    orderBy: [
      { isPinned: "desc" },
      { lastActivityAt: "desc" },
    ],
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const formattedConversations = dbConversations.map((c) => ({
    id: c.id,
    title: c.title,
    lastActivityAt: c.lastActivityAt.toISOString(),
    isPinned: c.isPinned,
    messages: c.messages.map((m) => ({
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  return (
    <main className="min-h-screen flex flex-col justify-center p-0 md:p-4">
      <UserChatDashboard
        initialUser={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          preferredLanguage: user.preferredLanguage || "en",
        }}
        initialLimits={limits}
        initialConversations={formattedConversations}
      />
    </main>
  );
}
