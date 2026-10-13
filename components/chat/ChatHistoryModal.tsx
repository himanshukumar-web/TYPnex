"use client";

import React, { useState } from "react";
import { MessageSquare, Search, Edit2, Check, X, Clock, Pin } from "lucide-react";

export interface ConversationSummary {
  id: string;
  title: string;
  lastActivityAt: string;
  isPinned?: boolean;
  messages?: Array<{
    content: string;
    createdAt: string;
  }>;
}

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
}

export function ChatHistoryModal({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onRenameConversation,
}: ChatHistoryModalProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  if (!isOpen) return null;

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.messages?.[0]?.content.toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (conv: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/20 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Chat History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Persistent, autosaved conversations ({conversations.length})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="my-3 relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search conversations by title or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl glass-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* List of Conversations (Sorted Newest First) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No conversations found.
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingId === conv.id;
              const lastMsg = conv.messages?.[0]?.content;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectConversation(conv.id);
                      onClose();
                    }
                  }}
                  className={`w-full p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isActive
                      ? "bg-blue-600/10 border-blue-500/40 shadow-sm"
                      : "glass-card hover:bg-white/80 dark:hover:bg-slate-800/80 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded-lg glass-input border border-blue-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={(e) => saveRename(conv.id, e)}
                          className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="p-1 rounded-md glass-card text-slate-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate">
                          {conv.isPinned && <Pin className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {conv.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startRename(conv, e)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            title="Rename Conversation"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                    <p className="truncate flex-1">
                      {lastMsg || "Support conversation"}
                    </p>
                    <span className="shrink-0 flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 opacity-60" />
                      {formatDate(conv.lastActivityAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatHistoryModal;
