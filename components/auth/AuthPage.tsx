"use client";

import React, { useState } from "react";
import {
  Globe,
  Mail,
  Lock,
  User,
  ArrowRight,
  Shield,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import TypnexLogo from "@/components/brand/TypnexLogo";
import { SUPPORTED_LANGUAGES } from "@/lib/translation/languages";

export function AuthPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP Verification state
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Normal Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.isBlocked) {
          setErrorMsg(`Your account has been blocked: ${data.reason || "Policy violation"}`);
        } else {
          setErrorMsg(data.error || "Authentication failed.");
        }
        return;
      }

      if (data.requiresVerification) {
        setOtpEmail(data.email);
        setIsVerifyingOtp(true);
        if (data.devOtp) setDevOtpHint(data.devOtp);
        setSuccessMsg("Please enter the verification OTP sent to your email.");
        return;
      }

      // Success -> Redirect to chat
      window.location.href = "/chat";
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // User Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
          preferredLanguage: selectedLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create account.");
        return;
      }

      setOtpEmail(data.email);
      setIsVerifyingOtp(true);
      if (data.devOtp) setDevOtpHint(data.devOtp);
      setSuccessMsg("Account created! Check your email for the 6-digit verification code.");
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification Submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, otp: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Invalid OTP code.");
        return;
      }

      setSuccessMsg("Email verified successfully! Opening your dashboard...");
      setTimeout(() => {
        window.location.href = "/chat";
      }, 800);
    } catch {
      setErrorMsg("Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login Simulation
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Simulate authentic Google User profile
      const demoEmail = prompt("Enter Google Account Email:", "alex.doe@gmail.com");
      if (!demoEmail) {
        setLoading(false);
        return;
      }
      const demoName = prompt("Enter Display Name:", "Alex Doe") || "Google User";

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: demoEmail,
          name: demoName,
          preferredLanguage: selectedLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Google login failed.");
        return;
      }

      window.location.href = "/chat";
    } catch {
      setErrorMsg("Failed to connect to Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6 my-auto">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/40 dark:border-white/10 relative overflow-hidden">
        {/* Top Language Selector */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Language</span>
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900">
                {l.flag} {l.name} ({l.nativeName})
              </option>
            ))}
          </select>
        </div>

        {/* Typnex Branding: Logo, Name & Tagline */}
        <div className="flex flex-col items-center text-center mb-8">
          <TypnexLogo size="lg" iconOnly={false} showTagline={true} />
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* OTP Verification Screen */}
        {isVerifyingOtp ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Verify Your Email</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                We sent a 6-digit OTP code to <span className="font-mono font-semibold">{otpEmail}</span>
              </p>
              {devOtpHint && (
                <div className="mt-2 p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-xs">
                  Dev OTP: <span className="font-bold">{devOtpHint}</span>
                </div>
              )}
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full text-center text-2xl tracking-widest font-mono py-3 rounded-2xl glass-card border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? "Verifying..." : "Verify & Open Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsVerifyingOtp(false)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <>
            {/* Tab Switcher: Login / Create Account */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-xl transition-all ${
                  tab === "login"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-xl transition-all ${
                  tab === "signup"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-2xl glass-card border border-slate-300/80 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-3 mb-5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">or with email</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Email / Password Forms */}
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Password reset OTP will be dispatched to your registered email address.");
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Authenticating..." : "Log In to Typnex"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Sarah Connor"
                      className="w-full pl-10 pr-4 py-2 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Creating Account..." : "Create Account & Send OTP"}</span>
                  <Sparkles className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Department Login Link */}
            <div className="mt-6 pt-5 border-t border-slate-200/50 dark:border-slate-800/50 text-center">
              <a
                href="/department/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Department / Staff Login</span>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
