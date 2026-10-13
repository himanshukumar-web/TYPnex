"use client";

import React, { useState } from "react";
import { Globe, X, Check, Search } from "lucide-react";
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/lib/translation/languages";

interface LanguageModalProps {
  isOpen: boolean;
  currentLanguage: string;
  onSelectLanguage: (langCode: string) => void;
  onClose: () => void;
  isInitialSetup?: boolean;
}

export function LanguageModal({
  isOpen,
  currentLanguage,
  onSelectLanguage,
  onClose,
  isInitialSetup = false,
}: LanguageModalProps) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/20 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {isInitialSetup ? "Choose Your Preferred Language" : "Change Language"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Support for Unicode and major world languages
              </p>
            </div>
          </div>
          {!isInitialSetup && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="my-3 relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl glass-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
          {filtered.map((lang: SupportedLanguage) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  onSelectLanguage(lang.code);
                  if (!isInitialSetup) onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md font-semibold"
                    : "glass-card hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{lang.flag}</span>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium">{lang.name}</span>
                    <span className={`text-xs ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                      {lang.nativeName}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </div>

        {isInitialSetup && (
          <div className="pt-4 mt-2 border-t border-white/20 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all"
            >
              Continue to Typnex Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LanguageModal;
