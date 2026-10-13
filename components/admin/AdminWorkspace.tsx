"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  Check,
  Ban,
  Send,
  Paperclip,
  MoreVertical,
  ArrowLeft,
  BarChart3,
  Settings,
  Shield,
  FileText,
  Clock,
  Download,
  AlertTriangle,
  LogOut,
  UserCheck,
  UserX,
  Plus,
} from "lucide-react";
import TypnexLogo from "@/components/brand/TypnexLogo";
import AudioPlayer from "@/components/chat/AudioPlayer";

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  isBlocked: boolean;
  blockReason?: string;
  preferredLanguage: string;
  conversationId: string | null;
  lastMessage: string;
  lastActivityAt: string;
  hasUnread: boolean;
}

interface AdminMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  translatedContent?: string | null;
  deliveryState: string;
  isRead: boolean;
  createdAt: string;
  attachments?: Array<{
    id: string;
    filename: string;
    fileKey: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    isAudio: boolean;
    protectedFromOwner: boolean;
  }>;
  audioMessage?: {
    id: string;
    durationSeconds: number;
    audioUrl: string;
  } | null;
}

interface AdminWorkspaceProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "EMPLOYEE";
    department?: string;
    permissions?: {
      canVerifyUsers: boolean;
      canBlockUsers: boolean;
      canDeleteMessages: boolean;
      canViewAnalytics: boolean;
    } | null;
  };
}

export function AdminWorkspace({ currentUser }: AdminWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"chats" | "analytics" | "settings" | "employees" | "audit">("chats");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "verified" | "blocked">("all");
  const [mobileChatViewOpen, setMobileChatViewOpen] = useState(false);

  // Active chat state
  const [messages, setMessages] = useState<AdminMessageItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendAsProtected, setSendAsProtected] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Modals state
  const [blockModalUser, setBlockModalUser] = useState<AdminUserItem | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState("");
  const [userDetailsModal, setUserDetailsModal] = useState<AdminUserItem | null>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);

  // Dashboard Stats state
  const [stats, setStats] = useState<{
    metrics: Record<string, string | number>;
    chartData: Array<{ date: string; messages: number; files: number; activeUsers: number }>;
  } | null>(null);

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    dailyChatLimit: 100,
    dailyFileLimit: 20,
    maxFileSizeMB: 20,
    adGateEnabled: true,
    adGateDurationSec: 5,
    interstitialIntervalHours: 12,
  });

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; actorEmail: string; action: string; targetType: string; createdAt: string; metadata: string | null }>>([]);

  // Employees state
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; email: string; employeeRecord?: { department: string; canVerifyUsers: boolean; canBlockUsers: boolean } }>>([]);
  const [newEmployeeForm, setNewEmployeeForm] = useState({ name: "", email: "", password: "", department: "Support", canVerifyUsers: false, canBlockUsers: false });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load user list
  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}&filter=${filterType}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (!selectedUserId && data.users?.length > 0 && window.innerWidth >= 768) {
          selectUser(data.users[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterType]);

  // Load stats when analytics tab clicked
  useEffect(() => {
    if (activeTab === "analytics") {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then((d) => setStats(d))
        .catch(console.error);
    } else if (activeTab === "settings") {
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((d) => {
          if (d.settings) {
            setSettingsForm({
              dailyChatLimit: d.settings.dailyChatLimit,
              dailyFileLimit: d.settings.dailyFileLimit,
              maxFileSizeMB: d.settings.maxFileSizeMB,
              adGateEnabled: d.settings.adGateEnabled,
              adGateDurationSec: d.settings.adGateDurationSec,
              interstitialIntervalHours: d.settings.interstitialIntervalHours,
            });
          }
        })
        .catch(console.error);
    } else if (activeTab === "audit") {
      fetch("/api/admin/audit-logs")
        .then((r) => r.json())
        .then((d) => setAuditLogs(d.logs || []))
        .catch(console.error);
    } else if (activeTab === "employees") {
      fetch("/api/admin/employees")
        .then((r) => r.json())
        .then((d) => setEmployees(d.employees || []))
        .catch(console.error);
    }
  }, [activeTab]);

  // Select user conversation
  const selectUser = async (u: AdminUserItem) => {
    setSelectedUserId(u.id);
    setMobileChatViewOpen(true);

    if (u.conversationId) {
      setActiveConversationId(u.conversationId);
      loadConversation(u.conversationId);
    } else {
      // Fetch or create conversation for this user
      try {
        const res = await fetch(`/api/chat/conversations?userId=${u.id}`);
        if (res.ok) {
          const data = await res.json();
          const conv = data.conversations?.[0];
          if (conv) {
            setActiveConversationId(conv.id);
            loadConversation(conv.id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.conversation?.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send message from support side
  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConversationId || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          content: replyText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setReplyText("");
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // Upload file from support side
  const handleSupportFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", activeConversationId);
    if (sendAsProtected) {
      formData.append("protectedFromOwner", "true");
    }

    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (err) {
      console.error(err);
    }
    e.target.value = "";
  };

  // Toggle Blue Tick verification
  const handleToggleVerification = async (targetUser: AdminUserItem) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !targetUser.isVerified }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isVerified: !u.isVerified } : u))
        );
        alert(`Verification updated for ${targetUser.name}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Block user
  const handleConfirmBlock = async () => {
    if (!blockModalUser) return;
    try {
      const res = await fetch(`/api/admin/users/${blockModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: true, blockReason: blockReasonInput.trim() }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === blockModalUser.id ? { ...u, isBlocked: true, blockReason: blockReasonInput } : u
          )
        );
        setBlockModalUser(null);
        setBlockReasonInput("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Unblock user
  const handleUnblock = async (targetUser: AdminUserItem) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: false }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isBlocked: false, blockReason: undefined } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Top Department Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-white/10 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <TypnexLogo size="sm" />
          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider">
            {currentUser.role} CONSOLE
          </span>
        </div>

        {/* Console Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-white/10 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("chats")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "chats" ? "bg-blue-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Support Chats</span>
          </button>

          {currentUser.role === "ADMIN" && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "analytics" ? "bg-blue-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("employees")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "employees" ? "bg-blue-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Employees</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "settings" ? "bg-blue-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>System Limits</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "audit" ? "bg-blue-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
              </button>
            </>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right text-xs">
            <span className="font-semibold text-white">{currentUser.name}</span>
            <span className="text-slate-400 text-[10px]">{currentUser.email}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/department/login";
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* ================= TAB 1: CHATS VIEW ================= */}
        {activeTab === "chats" && (
          <div className="flex h-full w-full">
            {/* LEFT 30% ON DESKTOP: User List */}
            <div
              className={`w-full md:w-[32%] md:min-w-[320px] md:max-w-[420px] h-full flex flex-col bg-slate-950/60 border-r border-white/10 ${
                mobileChatViewOpen ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Search & Filters */}
              <div className="p-3 border-b border-white/10 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search users by name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  {(["all", "verified", "blocked"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                        filterType === t
                          ? "bg-blue-600 text-white font-semibold"
                          : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">No users found.</div>
                ) : (
                  users.map((u) => {
                    const isSelected = u.id === selectedUserId;
                    return (
                      <div
                        key={u.id}
                        onClick={() => selectUser(u)}
                        className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 ${
                          isSelected
                            ? "bg-blue-600/15 border-l-4 border-blue-500"
                            : "hover:bg-slate-900/60"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-xs text-white truncate">{u.name}</span>
                              {u.isVerified && (
                                <span title="Verified User" className="p-0.5 rounded-full bg-blue-500 text-white">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                              )}
                              {u.isBlocked && (
                                <span title="Blocked User" className="p-0.5 rounded-full bg-rose-500 text-white">
                                  <Ban className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              {new Date(u.lastActivityAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 truncate">{u.lastMessage}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT 70% ON DESKTOP: Selected Conversation Workspace */}
            <div
              className={`flex-1 h-full flex flex-col bg-slate-900/80 ${
                !mobileChatViewOpen ? "hidden md:flex" : "flex"
              }`}
            >
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="px-4 py-3 bg-slate-950/70 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      {/* Mobile Back Button */}
                      <button
                        type="button"
                        onClick={() => setMobileChatViewOpen(false)}
                        className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{selectedUser.name}</span>
                          {selectedUser.isVerified && (
                            <span className="p-0.5 rounded-full bg-blue-500 text-white">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                          {selectedUser.isBlocked && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-semibold">
                              BLOCKED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{selectedUser.email}</span>
                      </div>
                    </div>

                    {/* Admin Actions Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setChatMenuOpen(!chatMenuOpen)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {chatMenuOpen && (
                        <div className="absolute right-0 top-10 w-52 bg-slate-950 border border-white/15 rounded-2xl p-1.5 shadow-2xl z-40 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setChatMenuOpen(false);
                              setUserDetailsModal(selectedUser);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-left text-slate-200"
                          >
                            <Users className="w-4 h-4 text-blue-400" />
                            <span>User Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setChatMenuOpen(false);
                              handleToggleVerification(selectedUser);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-left text-slate-200"
                          >
                            {selectedUser.isVerified ? (
                              <>
                                <UserX className="w-4 h-4 text-amber-400" />
                                <span>Remove Blue Tick</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 text-blue-400" />
                                <span>Grant Blue Tick</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setChatMenuOpen(false);
                              if (selectedUser.isBlocked) {
                                handleUnblock(selectedUser);
                              } else {
                                setBlockModalUser(selectedUser);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-left text-slate-200"
                          >
                            {selectedUser.isBlocked ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Unblock User</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4 text-rose-400" />
                                <span>Permanently Block User</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40 custom-scrollbar">
                    {messages.map((m) => {
                      const isSupport = m.senderRole === "ADMIN" || m.senderRole === "EMPLOYEE";
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isSupport ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl p-3 shadow-md ${
                              isSupport
                                ? "bg-blue-600 text-white rounded-tr-sm"
                                : "bg-slate-800 text-slate-100 rounded-tl-sm border border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold opacity-80">
                              <span>{isSupport ? "Typnex Department" : selectedUser.name}</span>
                            </div>

                            <p className="text-xs whitespace-pre-wrap leading-relaxed">{m.content}</p>

                            {/* Attachments */}
                            {m.attachments?.map((att) => (
                              <div key={att.id} className="mt-2 p-2 rounded-xl bg-black/20 flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{att.filename}</span>
                                </div>
                                <a
                                  href={`/api/files/download/${att.fileKey}?adGateCompleted=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-white/20 hover:bg-white/30 text-white shrink-0"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ))}

                            {m.audioMessage && (
                              <div className="mt-2">
                                <AudioPlayer src={m.audioMessage.audioUrl} durationSeconds={m.audioMessage.durationSeconds} />
                              </div>
                            )}

                            <span className="block text-right text-[10px] opacity-60 mt-1 font-mono">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Box for Official Support Reply */}
                  <form onSubmit={handleSendSupportMessage} className="p-3 bg-slate-950/70 border-t border-white/10 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sendAsProtected}
                          onChange={(e) => setSendAsProtected(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span>Protect Attachment with Ad-Gate</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Attach File"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleSupportFileUpload}
                      />

                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type response as Typnex official support..."
                        className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      <button
                        type="submit"
                        disabled={!replyText.trim() || isSending}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md disabled:opacity-40"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  Select a user from the left panel to begin customer conversation.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: ANALYTICS DASHBOARD ================= */}
        {activeTab === "analytics" && stats && (
          <div className="p-6 overflow-y-auto h-full space-y-6 max-w-6xl mx-auto custom-scrollbar">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span>Platform Activity & Usage Metrics</span>
            </h2>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-xs text-slate-400">Total Users</span>
                <p className="text-2xl font-black text-white mt-1">{stats.metrics.totalUsers}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-xs text-slate-400">Active Users Today</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{stats.metrics.activeUsersToday}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-xs text-slate-400">Messages Today (IST)</span>
                <p className="text-2xl font-black text-blue-400 mt-1">{stats.metrics.messagesToday}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-xs text-slate-400">Files Today (IST)</span>
                <p className="text-2xl font-black text-indigo-400 mt-1">{stats.metrics.filesToday}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-xs text-slate-400">Blue Tick Verified Users</span>
                <p className="text-2xl font-black text-cyan-400 mt-1">{stats.metrics.verifiedUsers}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-xs text-slate-400">Blocked Users</span>
                <p className="text-2xl font-black text-rose-400 mt-1">{stats.metrics.blockedUsers}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-xs text-slate-400">Total Storage</span>
                <p className="text-2xl font-black text-amber-400 mt-1">{stats.metrics.storageMB}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10">
                <span className="text-xs text-slate-400">Department Employees</span>
                <p className="text-2xl font-black text-purple-400 mt-1">{stats.metrics.employeeCount}</p>
              </div>
            </div>

            {/* 7-Day Activity Table / Chart */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-white/10">
              <h3 className="text-sm font-bold text-white mb-4">Daily Usage Breakdown (Asia/Kolkata Cycle)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-white/10 text-slate-500 uppercase">
                    <tr>
                      <th className="py-2">Date (IST)</th>
                      <th className="py-2">Active Users</th>
                      <th className="py-2">Total Messages</th>
                      <th className="py-2">Total Files</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.chartData.map((row) => (
                      <tr key={row.date}>
                        <td className="py-2.5 font-mono">{row.date}</td>
                        <td className="py-2.5 font-semibold text-emerald-400">{row.activeUsers}</td>
                        <td className="py-2.5 font-semibold text-blue-400">{row.messages}</td>
                        <td className="py-2.5 font-semibold text-indigo-400">{row.files}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: SYSTEM SETTINGS ================= */}
        {activeTab === "settings" && (
          <div className="p-6 overflow-y-auto h-full max-w-2xl mx-auto space-y-6 custom-scrollbar">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              <span>Admin Quotas & Security Configuration</span>
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch("/api/admin/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(settingsForm),
                });
                if (res.ok) alert("System settings updated successfully.");
              }}
              className="space-y-4 p-5 rounded-2xl bg-slate-950 border border-white/10 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1">Daily Chat Limit per User (IST Day Cycle)</label>
                <input
                  type="number"
                  value={settingsForm.dailyChatLimit}
                  onChange={(e) => setSettingsForm({ ...settingsForm, dailyChatLimit: parseInt(e.target.value) || 100 })}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Daily File Limit per User (IST Day Cycle)</label>
                <input
                  type="number"
                  value={settingsForm.dailyFileLimit}
                  onChange={(e) => setSettingsForm({ ...settingsForm, dailyFileLimit: parseInt(e.target.value) || 20 })}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Max File Size (MB) - Strictly Non-Video</label>
                <input
                  type="number"
                  value={settingsForm.maxFileSizeMB}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxFileSizeMB: parseInt(e.target.value) || 20 })}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Ad-Gate Duration for Protected Owner Files (Seconds)</label>
                <input
                  type="number"
                  value={settingsForm.adGateDurationSec}
                  onChange={(e) => setSettingsForm({ ...settingsForm, adGateDurationSec: parseInt(e.target.value) || 5 })}
                  className="w-full p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
              >
                Save System Limits
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 4: EMPLOYEES MANAGEMENT ================= */}
        {activeTab === "employees" && (
          <div className="p-6 overflow-y-auto h-full max-w-4xl mx-auto space-y-6 custom-scrollbar">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span>Department Employees & Permissions</span>
            </h2>

            {/* Create New Employee Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch("/api/admin/employees", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(newEmployeeForm),
                });
                if (res.ok) {
                  alert("Employee created successfully.");
                  setNewEmployeeForm({ name: "", email: "", password: "", department: "Support", canVerifyUsers: false, canBlockUsers: false });
                  fetch("/api/admin/employees").then((r) => r.json()).then((d) => setEmployees(d.employees || []));
                }
              }}
              className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-3 text-xs"
            >
              <h3 className="font-bold text-white text-sm mb-2">Create New Department Staff</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newEmployeeForm.name}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, name: e.target.value })}
                  className="p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white"
                  required
                />
                <input
                  type="email"
                  placeholder="Staff Email"
                  value={newEmployeeForm.email}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                  className="p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white"
                  required
                />
                <input
                  type="password"
                  placeholder="Temporary Password"
                  value={newEmployeeForm.password}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, password: e.target.value })}
                  className="p-2.5 bg-slate-900 border border-white/10 rounded-xl text-white"
                  required
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEmployeeForm.canVerifyUsers}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, canVerifyUsers: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Can Verify Users (Blue Tick)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEmployeeForm.canBlockUsers}
                    onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, canBlockUsers: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Can Permanently Block Users</span>
                </label>
              </div>

              <button
                type="submit"
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Employee
              </button>
            </form>

            {/* Existing Employees List */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-white/10">
              <h3 className="font-bold text-white text-sm mb-4">Active Staff Members ({employees.length})</h3>
              <div className="space-y-3">
                {employees.map((emp) => (
                  <div key={emp.id} className="p-3 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{emp.name}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{emp.email}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
                        Dept: {emp.employeeRecord?.department || "Support"}
                      </span>
                      {emp.employeeRecord?.canVerifyUsers && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">Can Verify</span>
                      )}
                      {emp.employeeRecord?.canBlockUsers && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400">Can Block</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: AUDIT LOGS ================= */}
        {activeTab === "audit" && (
          <div className="p-6 overflow-y-auto h-full max-w-5xl mx-auto space-y-4 custom-scrollbar">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>Administrative Compliance & Audit Trail</span>
            </h2>

            <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-white/10 text-slate-500 uppercase">
                  <tr>
                    <th className="py-2">Timestamp</th>
                    <th className="py-2">Admin / Actor</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Target Type</th>
                    <th className="py-2">Metadata Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 text-blue-400">{log.actorEmail}</td>
                      <td className="py-2.5 font-bold text-white">{log.action}</td>
                      <td className="py-2.5 text-slate-400">{log.targetType}</td>
                      <td className="py-2.5 text-slate-500 truncate max-w-xs">{log.metadata || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Block Confirmation Modal */}
      {blockModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl p-6 bg-slate-950 border border-rose-500/30 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-white mb-1">Permanently Block {blockModalUser.name}?</h3>
            <p className="text-xs text-slate-400 mb-4">
              Blocked users cannot send messages, upload files, or create new chats.
            </p>

            <textarea
              placeholder="Reason for blocking (audit trail)..."
              value={blockReasonInput}
              onChange={(e) => setBlockReasonInput(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-500 mb-4 focus:outline-none"
              rows={3}
            />

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setBlockModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-500/20"
              >
                Yes, Block User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {userDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl p-6 bg-slate-950 border border-white/15 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">User Profile & Limits Details</h3>
            <div className="p-3 rounded-xl bg-slate-900 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-white">{userDetailsModal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-white">{userDetailsModal.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Blue Tick Status:</span>
                <span className="font-semibold text-blue-400">{userDetailsModal.isVerified ? "Verified (Unlimited Quota)" : "Standard Free User"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Status:</span>
                <span className={userDetailsModal.isBlocked ? "font-bold text-rose-400" : "font-semibold text-emerald-400"}>
                  {userDetailsModal.isBlocked ? "Blocked" : "Active"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUserDetailsModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminWorkspace;
