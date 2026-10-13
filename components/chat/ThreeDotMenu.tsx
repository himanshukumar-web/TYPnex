"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  PlusCircle,
  History,
  Search,
  Edit2,
  Trash2,
  FileText,
  Globe,
  Sun,
  Moon,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  AlertTriangle,
} from "lucide-react";

interface ThreeDotMenuProps {
  onNewChat: () => void;
  onOpenHistory: () => void;
  onSearch: () => void;
  onRenameChat: () => void;
  onClearCurrentChat: () => void;
  onClearAllChats: () => void;
  onOpenFileSharing: () => void;
  onOpenLanguage: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenSettings: (type: "notifications" | "privacy" | "help") => void;
  onLogout: () => void;
}

export function ThreeDotMenu({
  onNewChat,
  onOpenHistory,
  onSearch,
  onRenameChat,
  onClearCurrentChat,
  onClearAllChats,
  onOpenFileSharing,
  onOpenLanguage,
  theme,
  onToggleTheme,
  onOpenSettings,
  onLogout,
}: ThreeDotMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerConfirm = (title: string, description: string, action: () => void) => {
    setIsOpen(false);
    setConfirmModal({
      isOpen: true,
      title,
      description,
      action: () => {
        action();
        setConfirmModal(null);
      },
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/50 transition-colors"
        title="More Options"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl glass-panel p-2 shadow-2xl border border-white/20 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNewChat();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-blue-500" />
              <span>New Chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenHistory();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Chat History</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSearch();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>Search Chats</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onRenameChat();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Edit2 className="w-4 h-4 text-slate-500" />
              <span>Rename Chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenFileSharing();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>File Sharing</span>
            </button>

            <div className="my-1 border-t border-slate-200/60 dark:border-slate-700/60" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenLanguage();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Globe className="w-4 h-4 text-indigo-500" />
              <span>Language</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onToggleTheme();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings("notifications");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Bell className="w-4 h-4 text-slate-500" />
              <span>Notifications</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings("privacy");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Privacy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings("help");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Help & Guide</span>
            </button>

            <div className="my-1 border-t border-slate-200/60 dark:border-slate-700/60" />

            {/* Destructive Actions with Confirmation */}
            <button
              type="button"
              onClick={() =>
                triggerConfirm(
                  "Clear Current Chat",
                  "Are you sure you want to clear all messages in this conversation? This action cannot be undone.",
                  onClearCurrentChat
                )
              }
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Clear Current Chat</span>
            </button>

            <button
              type="button"
              onClick={() =>
                triggerConfirm(
                  "Clear All Chats",
                  "Are you sure you want to clear all your saved chat conversations? This action cannot be undone.",
                  onClearAllChats
                )
              }
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Clear All Chats</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-rose-500/20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {confirmModal.description}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl glass-card text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.action}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-500/20"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThreeDotMenu;
