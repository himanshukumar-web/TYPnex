"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Paperclip,
  Camera,
  Mic,
  Check,
  CheckCheck,
  FileText,
  Download,
  AlertCircle,
  Sparkles,
  Lock,
  Languages,
} from "lucide-react";
import TypnexLogo from "@/components/brand/TypnexLogo";
import AdBanner from "./AdBanners";
import InterstitialAdModal from "./InterstitialAdModal";
import ProtectedFileGateModal from "./ProtectedFileGateModal";
import AudioRecorder from "./AudioRecorder";
import CameraCaptureModal from "./CameraCaptureModal";
import AudioPlayer from "./AudioPlayer";
import ThreeDotMenu from "./ThreeDotMenu";
import ChatHistoryModal, { ConversationSummary } from "./ChatHistoryModal";
import LanguageModal from "./LanguageModal";
import { UserLimitStatus } from "@/lib/limits/istDate";

interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  translatedContent?: string | null;
  originalLanguage?: string | null;
  deliveryState: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    role: string;
    isVerified: boolean;
  };
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

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  preferredLanguage: string;
}

interface UserChatDashboardProps {
  initialUser: UserProfile;
  initialLimits: UserLimitStatus;
  initialConversations: ConversationSummary[];
}

export function UserChatDashboard({
  initialUser,
  initialLimits,
  initialConversations,
}: UserChatDashboardProps) {
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [limits, setLimits] = useState<UserLimitStatus>(initialLimits);
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string>(
    initialConversations[0]?.id || ""
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showOriginalMap, setShowOriginalMap] = useState<Record<string, boolean>>({});

  // Modals state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isInitialLangSetup, setIsInitialLangSetup] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [gateModal, setGateModal] = useState<{
    isOpen: boolean;
    filename: string;
    fileKey: string;
    durationSec: number;
  }>({
    isOpen: false,
    filename: "",
    fileKey: "",
    durationSec: 5,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fullImageViewUrl, setFullImageViewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastSyncTimestamp = useRef<string>(new Date().toISOString());

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load active conversation messages
  useEffect(() => {
    if (!activeConvId) return;

    async function loadConversationMessages() {
      try {
        const res = await fetch(`/api/chat/conversations/${activeConvId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.conversation?.messages) {
            setMessages(data.conversation.messages);
            lastSyncTimestamp.current = new Date().toISOString();
          }
        }
      } catch (err) {
        console.error("Load messages error:", err);
      }
    }

    loadConversationMessages();
  }, [activeConvId]);

  // Real-time synchronization polling (every 4 seconds)
  useEffect(() => {
    if (!activeConvId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/chat/sync?conversationId=${activeConvId}&since=${encodeURIComponent(
            lastSyncTimestamp.current
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newItems = data.messages.filter((m: MessageItem) => !existingIds.has(m.id));
              return [...prev, ...newItems];
            });
            lastSyncTimestamp.current = data.serverTime || new Date().toISOString();
          }
        }
      } catch {
        // silent sync retry
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeConvId]);

  // Theme application
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Language change
  const handleSelectLanguage = async (langCode: string) => {
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: langCode }),
      });
      if (res.ok) {
        setUser((prev) => ({ ...prev, preferredLanguage: langCode }));
      }
    } catch (err) {
      console.error(err);
    }
    setIsLanguageOpen(false);
    setIsInitialLangSetup(false);
  };

  // Send text message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending || !activeConvId) return;

    if (!limits.isVerified && !limits.canSendChat) {
      setErrorMessage(`Daily chat limit reached (${limits.chatLimit} messages). Limit resets at 12:00 AM IST (in ${limits.resetIn}).`);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          content: inputText.trim(),
          targetLanguage: user.preferredLanguage,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setErrorMessage(errorData.message || errorData.error || "Failed to send message.");
        if (errorData.limitReached) {
          setLimits((prev) => ({ ...prev, canSendChat: false, remainingChats: 0 }));
        }
      } else {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setInputText("");
        // Update user limits
        if (!limits.isVerified) {
          setLimits((prev) => ({
            ...prev,
            chatCount: prev.chatCount + 1,
            remainingChats: Math.max(0, prev.remainingChats - 1),
            canSendChat: prev.chatCount + 1 < prev.chatLimit,
          }));
        }
      }
    } catch {
      setErrorMessage("Unable to send message. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  };

  // Upload file (Attachments, Camera, Voice Notes)
  const handleUploadFile = async (file: File, isAudio: boolean = false, durationSeconds: number = 0) => {
    setErrorMessage(null);

    // Frontend validation: Video check
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|3gp|flv|wmv)$/i.test(file.name);
    if (isVideo && !isAudio) {
      setErrorMessage("Video files are not supported.");
      return;
    }

    // Frontend validation: 20 MB size check
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("Maximum file size is 20 MB.");
      return;
    }

    // Limits check
    if (!limits.isVerified && !limits.canSendFile) {
      setErrorMessage(`Daily file limit reached (${limits.fileLimit} files). Resets at 12:00 AM IST (in ${limits.resetIn}).`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", activeConvId);
    if (isAudio) {
      formData.append("isAudio", "true");
      formData.append("durationSeconds", durationSeconds.toString());
    }

    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        setErrorMessage(errorData.error || "Upload failed. Retry.");
        if (errorData.limitReached) {
          setLimits((prev) => ({ ...prev, canSendFile: false, remainingFiles: 0 }));
        }
      } else {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        if (!limits.isVerified) {
          setLimits((prev) => ({
            ...prev,
            fileCount: prev.fileCount + 1,
            remainingFiles: Math.max(0, prev.remainingFiles - 1),
            canSendFile: prev.fileCount + 1 < prev.fileLimit,
          }));
        }
      }
    } catch {
      setErrorMessage("Upload failed. Retry.");
    }
  };

  // File download with Protected Owner Gate check
  const handleDownloadFile = async (
    fileKey: string,
    filename: string,
    isProtectedFromOwner: boolean,
    adGatePassed: boolean = false
  ) => {
    if (isProtectedFromOwner && !adGatePassed) {
      setGateModal({
        isOpen: true,
        filename,
        fileKey,
        durationSec: 5,
      });
      return;
    }

    // Direct download
    window.open(`/api/files/download/${fileKey}?adGateCompleted=true`, "_blank");
  };

  // Create New Chat (Autosaves existing)
  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Support Chat ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newConv = data.conversation;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(newConv.id);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Clear current chat
  const handleClearCurrentChat = async () => {
    if (!activeConvId) return;
    try {
      const res = await fetch(`/api/chat/conversations/${activeConvId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Clear all chats
  const handleClearAllChats = async () => {
    try {
      const res = await fetch("/api/chat/conversations/clear-all", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setConversations([data.conversation]);
        setActiveConvId(data.conversation.id);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Rename conversation
  const handleRenameActiveChat = async () => {
    const newTitle = prompt("Enter new title for this conversation:");
    if (!newTitle || !newTitle.trim()) return;

    try {
      const res = await fetch(`/api/chat/conversations/${activeConvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, title: newTitle.trim() } : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="relative flex flex-col h-[100dvh] w-full max-w-5xl mx-auto overflow-hidden shadow-2xl glass-panel md:rounded-3xl md:my-4 border border-white/20 dark:border-white/10">
      {/* 1. TOP HEADER */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/20 dark:border-white/10 shrink-0 z-20 glass-panel">
        <div className="flex items-center gap-3">
          <TypnexLogo size="sm" iconOnly={false} />
          <div className="hidden sm:block h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-xs">
                {user.name}
              </span>
              {/* Blue Verification Tick */}
              {user.isVerified && (
                <span
                  title="Verified Typnex User (Unlimited Access)"
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Official Typnex Support Desk</span>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Daily Quota Badge */}
          {!limits.isVerified && (
            <div
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl glass-card text-[11px] text-slate-600 dark:text-slate-300 font-mono"
              title={`Daily limit resets at 12:00 AM IST (in ${limits.resetIn})`}
            >
              <span>Chats: {limits.chatLimit - limits.chatCount}/{limits.chatLimit}</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span>Files: {limits.fileLimit - limits.fileCount}/{limits.fileLimit}</span>
            </div>
          )}

          {/* Three-Dot Menu */}
          <ThreeDotMenu
            onNewChat={handleNewChat}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onSearch={() => setIsHistoryOpen(true)}
            onRenameChat={handleRenameActiveChat}
            onClearCurrentChat={handleClearCurrentChat}
            onClearAllChats={handleClearAllChats}
            onOpenFileSharing={() => alert("File Sharing: All document attachments are stored safely in your Typnex session.")}
            onOpenLanguage={() => setIsLanguageOpen(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenSettings={(type) => alert(`Settings: ${type} settings saved.`)}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* 2. USER AD BANNER: Immediately Below User Name / Header */}
      <AdBanner position="top" userRole={user.role} />

      {/* Daily Limit Warning Banner */}
      {(!limits.canSendChat || !limits.canSendFile) && !limits.isVerified && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {!limits.canSendChat
                ? `Daily chat limit reached (${limits.chatLimit} actions).`
                : `Daily file limit reached (${limits.fileLimit} files).`}{" "}
              Quotas reset at 12:00 AM IST.
            </span>
          </div>
          <span className="font-mono font-semibold shrink-0">Resets in {limits.resetIn}</span>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="px-4 py-2 bg-rose-500/15 border-b border-rose-500/30 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. CHAT WORKSPACE AREA (WhatsApp Style Wallpaper + Liquid Glass Cards) */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3 whatsapp-wallpaper custom-scrollbar">
        {/* Conversation Title & Encryption Notice */}
        <div className="flex flex-col items-center justify-center my-2 gap-1.5 select-none">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-card text-[11px] font-medium text-slate-500 dark:text-slate-400 border border-white/20 shadow-sm">
            <Lock className="w-3 h-3 text-emerald-500" />
            <span>End-to-end verified communication with Typnex</span>
          </div>
          {activeConv && (
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {activeConv.title}
            </span>
          )}
        </div>

        {/* Message Cards */}
        {messages.map((msg) => {
          const isUser = msg.senderRole === "USER";
          const showOriginal = showOriginalMap[msg.id] || false;
          const displayContent =
            !showOriginal && msg.translatedContent ? msg.translatedContent : msg.content;
          const hasTranslation = !!msg.translatedContent && msg.translatedContent !== msg.content;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full animate-in fade-in duration-150`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md ${
                  isUser
                    ? "glass-bubble-user text-slate-900 dark:text-slate-100 rounded-tr-sm"
                    : "glass-bubble-support text-slate-900 dark:text-slate-100 rounded-tl-sm"
                }`}
              >
                {/* Sender Title for Support */}
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    <span>Typnex Support Desk</span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </div>
                )}

                {/* Text Content */}
                {displayContent && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                    {displayContent}
                  </p>
                )}

                {/* Translation Indicator & Toggle */}
                {hasTranslation && (
                  <div className="mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400">
                    <span className="flex items-center gap-1">
                      <Languages className="w-3 h-3" />
                      <span>{showOriginal ? "Showing Original" : "Translated to your language"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setShowOriginalMap((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))
                      }
                      className="font-medium underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      {showOriginal ? "Show Translation" : "Show Original"}
                    </button>
                  </div>
                )}

                {/* Attachments Preview */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.attachments.map((att) => {
                      const isImage = att.mimeType.startsWith("image/");
                      return (
                        <div key={att.id} className="rounded-xl overflow-hidden glass-card p-2 border border-white/20">
                          {isImage ? (
                            <div className="relative group cursor-pointer" onClick={() => setFullImageViewUrl(att.url)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={att.url}
                                alt={att.filename}
                                className="w-full max-h-60 object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-xs font-medium">
                                Click to view full image
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3 p-1">
                              <div className="flex items-center gap-2.5 truncate">
                                <FileText className="w-6 h-6 text-blue-500 shrink-0" />
                                <div className="truncate">
                                  <p className="text-xs font-semibold truncate">{att.filename}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    {(att.sizeBytes / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(att.fileKey, att.filename, att.protectedFromOwner)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shrink-0 transition-all shadow-sm"
                              >
                                {att.protectedFromOwner ? <Lock className="w-3 h-3 text-amber-300" /> : <Download className="w-3 h-3" />}
                                <span>Download</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Audio Message Player */}
                {msg.audioMessage && (
                  <div className="mt-2">
                    <AudioPlayer
                      src={msg.audioMessage.audioUrl}
                      durationSeconds={msg.audioMessage.durationSeconds}
                    />
                  </div>
                )}

                {/* Footer Metadata: Timestamp & Delivery State */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-mono">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isUser && (
                    <span>
                      {msg.deliveryState === "READ" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                      ) : msg.deliveryState === "DELIVERED" ? (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* 4. USER AD BANNER: Immediately Above Typing / Input Box */}
      <AdBanner position="bottom" userRole={user.role} />

      {/* 5. BOTTOM INPUT ACTION BAR */}
      <footer className="p-3 border-t border-white/20 dark:border-white/10 glass-panel shrink-0 z-20">
        {isRecordingAudio ? (
          <AudioRecorder
            onAudioReady={(file, duration) => {
              setIsRecordingAudio(false);
              handleUploadFile(file, true, duration);
            }}
            onCancel={() => setIsRecordingAudio(false)}
          />
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl glass-card hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
              title="Attach File (Images, PDFs, Docs, Audio - Max 20MB, No Videos)"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file);
                e.target.value = "";
              }}
            />

            {/* Camera Button */}
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="p-2.5 rounded-2xl glass-card hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
              title="Capture Photo"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Microphone Button */}
            <button
              type="button"
              onClick={() => setIsRecordingAudio(true)}
              className="p-2.5 rounded-2xl glass-card hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
              title="Record Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message or draft..."
              className="flex-1 px-4 py-2.5 rounded-2xl glass-card text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 disabled:opacity-40 transition-all active:scale-95 shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </footer>

      {/* Modals */}
      <InterstitialAdModal userRole={user.role} />

      <ProtectedFileGateModal
        isOpen={gateModal.isOpen}
        filename={gateModal.filename}
        fileKey={gateModal.fileKey}
        durationSec={gateModal.durationSec}
        onAdComplete={(key) => handleDownloadFile(key, gateModal.filename, false, true)}
        onClose={() => setGateModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={(file) => handleUploadFile(file)}
      />

      <ChatHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={conversations}
        activeConversationId={activeConvId}
        onSelectConversation={(id) => setActiveConvId(id)}
        onRenameConversation={async (id, title) => {
          await fetch(`/api/chat/conversations/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
          });
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, title } : c))
          );
        }}
      />

      <LanguageModal
        isOpen={isLanguageOpen || isInitialLangSetup}
        currentLanguage={user.preferredLanguage || "en"}
        onSelectLanguage={handleSelectLanguage}
        onClose={() => {
          setIsLanguageOpen(false);
          setIsInitialLangSetup(false);
        }}
        isInitialSetup={isInitialLangSetup}
      />

      {/* Full Image Preview Modal */}
      {fullImageViewUrl && (
        <div
          onClick={() => setFullImageViewUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullImageViewUrl}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

export default UserChatDashboard;
