"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  Check,
  Send,
  Paperclip,
  ArrowLeft,
  Download,
  LogOut,
  UserCheck,
  UserX,
  MessageSquare,
} from "lucide-react";
import TypnexLogo from "@/components/brand/TypnexLogo";
import AudioPlayer from "@/components/chat/AudioPlayer";

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  isBlocked: boolean;
  preferredLanguage: string;
  conversationId: string | null;
  lastMessage: string;
  lastActivityAt: string;
  hasUnread: boolean;
}

interface MessageItem {
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

interface EmployeeWorkspaceProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    department?: string;
    canManageAll?: boolean;
    permissions?: {
      canVerifyUsers: boolean;
      canBlockUsers: boolean;
      canDeleteMessages: boolean;
      canViewAnalytics: boolean;
    } | null;
  };
}

export default function EmployeeWorkspace({ currentUser }: EmployeeWorkspaceProps) {
  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AssignedUser | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Mobile layout state
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchAssignedUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/employee/users?search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.users?.length > 0 && !selectedUser) {
          setSelectedUser(data.users[0]);
          loadUserConversation(data.users[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load assigned users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load assigned users on mount
  useEffect(() => {
    fetchAssignedUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserConversation = async (user: AssignedUser) => {
    if (!user.conversationId) {
      setMessages([]);
      return;
    }

    try {
      setChatLoading(true);
      const res = await fetch(`/api/chat/messages?conversationId=${user.conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load conversation messages:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSelectUser = (user: AssignedUser) => {
    setSelectedUser(user);
    setMobileShowChat(true);
    loadUserConversation(user);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedUser?.conversationId || sending) return;

    const messageText = inputMessage.trim();
    setInputMessage("");
    setSending(true);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedUser.conversationId,
          content: messageText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser?.conversationId || uploading) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("File exceeds maximum allowed size of 20 MB.");
      return;
    }

    if (file.type.startsWith("video/")) {
      alert("Video uploads are not allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", selectedUser.conversationId);

    setUploading(true);
    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "File upload failed.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleToggleVerify = async (user: AssignedUser) => {
    if (!currentUser.permissions?.canVerifyUsers) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !user.isVerified }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isVerified: !u.isVerified } : u))
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => (prev ? { ...prev, isVerified: !prev.isVerified } : null));
        }
      }
    } catch (err) {
      console.error("Verify toggle failed:", err);
    }
  };

  const handleToggleBlock = async (user: AssignedUser) => {
    if (!currentUser.permissions?.canBlockUsers) return;

    const reason = user.isBlocked ? "" : prompt("Reason for blocking this user:");
    if (!user.isBlocked && reason === null) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBlocked: !user.isBlocked,
          blockReason: reason || "Assigned agent moderation",
        }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isBlocked: !u.isBlocked } : u))
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => (prev ? { ...prev, isBlocked: !prev.isBlocked } : null));
        }
      }
    } catch (err) {
      console.error("Block toggle failed:", err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/department/login";
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 antialiased overflow-hidden select-none font-sans">
      {/* 30% User List Column (Always full screen on mobile when mobileShowChat is false) */}
      <aside
        className={`w-full md:w-[32%] lg:w-[28%] xl:w-[25%] border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex flex-col transition-all duration-300 z-10 ${
          mobileShowChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TypnexLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-wide text-white">TYPnex</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Staff
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[150px]">
                {currentUser.name} • {currentUser.department || "Support"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assigned clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchAssignedUsers()}
              className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500">Loading assigned clients...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No clients currently assigned to you.
            </div>
          ) : (
            users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-indigo-600/15 border-l-2 border-indigo-500"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-indigo-900 flex items-center justify-center font-semibold text-white text-sm shadow">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    {u.isVerified && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 shadow-sm">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate flex items-center gap-1">
                        {u.name}
                        {u.isBlocked && (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1 rounded border border-rose-500/20">
                            Blocked
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(u.lastActivityAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">{u.lastMessage}</p>
                  </div>

                  {u.hasUnread && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* 70% Conversation Workspace (Hidden on mobile if list active) */}
      <section
        className={`flex-1 flex flex-col bg-slate-950/80 relative transition-all duration-300 ${
          !mobileShowChat ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedUser ? (
          <>
            {/* Conversation Header */}
            <header className="h-16 px-4 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  {selectedUser.isVerified && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 shadow-sm">
                      <Check className="w-2 h-2 text-white stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{selectedUser.name}</span>
                    <span className="text-[10px] text-slate-400">{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Lang: {selectedUser.preferredLanguage.toUpperCase()}</span>
                    <span>•</span>
                    <span className={selectedUser.isBlocked ? "text-rose-400" : "text-emerald-400"}>
                      {selectedUser.isBlocked ? "Account Blocked" : "Active Client"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employee Action Buttons */}
              <div className="flex items-center gap-2">
                {currentUser.permissions?.canVerifyUsers && (
                  <button
                    onClick={() => handleToggleVerify(selectedUser)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                      selectedUser.isVerified
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{selectedUser.isVerified ? "Verified" : "Verify"}</span>
                  </button>
                )}

                {currentUser.permissions?.canBlockUsers && (
                  <button
                    onClick={() => handleToggleBlock(selectedUser)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                      selectedUser.isBlocked
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-rose-500/10 hover:text-rose-400"
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{selectedUser.isBlocked ? "Unblock" : "Block"}</span>
                  </button>
                )}
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Loading chat history...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <MessageSquare className="w-10 h-10 stroke-1 mb-2 text-slate-600" />
                  <p className="text-xs">No messages in this customer thread yet.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isStaff = m.senderRole === "EMPLOYEE" || m.senderRole === "ADMIN";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md ${
                          isStaff
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-sm"
                            : "bg-slate-800/80 border border-slate-700/60 text-slate-100 rounded-bl-sm"
                        }`}
                      >
                        <p className="text-xs whitespace-pre-wrap leading-relaxed select-text">
                          {m.content}
                        </p>

                        {/* Attachments */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {m.attachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center justify-between gap-3 p-2 rounded-xl bg-black/20 border border-white/10 text-xs"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">{att.filename}</span>
                                </div>
                                <a
                                  href={`/api/files/download/${att.fileKey}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Audio Message */}
                        {m.audioMessage && (
                          <div className="mt-2">
                            <AudioPlayer
                              src={m.audioMessage.audioUrl}
                              durationSeconds={m.audioMessage.durationSeconds}
                            />
                          </div>
                        )}

                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px] opacity-75">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isStaff && <span>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <footer className="p-3 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Upload Document / File"
                  className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={
                    selectedUser.isBlocked
                      ? "User is blocked. Replies disabled."
                      : "Type your official response..."
                  }
                  value={inputMessage}
                  disabled={selectedUser.isBlocked || sending}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-slate-800/70 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || selectedUser.isBlocked || sending}
                  className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Users className="w-12 h-12 stroke-1 mb-3 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-300">No Client Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Select an assigned client from the sidebar to view their thread and provide typing support.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
