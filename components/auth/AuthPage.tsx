"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Mail,
  Lock,
  User,
  ArrowRight,
  Shield,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import TypnexLogo from "@/components/brand/TypnexLogo";
import { SUPPORTED_LANGUAGES } from "@/lib/translation/languages";

export interface AuthPageProps {
  initialMode?: "login" | "signup";
}

export function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const [tab, setTab] = useState<"login" | "signup">(initialMode);
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
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  // Status & message states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  // Google Modal state (Accessible non-blocking Google sign-in)
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("alex.doe@gmail.com");
  const [googleName, setGoogleName] = useState("Alex Doe");

  // Check URL query on mount for redirect parameter and tab synchronization
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
        setRedirectTarget(redirect);
      }

      const pathname = window.location.pathname;
      if (pathname.includes("/signup")) {
        setTab("signup");
      } else if (pathname.includes("/login")) {
        setTab("login");
      }
    }
  }, []);

  // Sync tab with initialMode if changed by parent router
  useEffect(() => {
    if (initialMode) {
      setTab(initialMode);
    }
  }, [initialMode]);

  // Handle Tab Switch with URL synchronization
  const handleTabSwitch = (newTab: "login" | "signup") => {
    setTab(newTab);
    setErrorMsg(null);
    setWarningMsg(null);
    setSuccessMsg(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.pathname = newTab === "login" ? "/login" : "/signup";
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (!isVerifyingOtp || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isVerifyingOtp, resendCooldown]);

  // Compute destination post-login
  const getDestinationUrl = (userRole?: string) => {
    if (redirectTarget) return redirectTarget;
    if (userRole === "ADMIN" || userRole === "EMPLOYEE") {
      return "/department";
    }
    return "/chat";
  };

  // Normal Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.isBlocked) {
          setErrorMsg(`Your account has been blocked: ${data.reason || "Administrative policy enforcement."}`);
        } else {
          setErrorMsg(data.error || "Authentication failed. Please verify credentials.");
        }
        return;
      }

      if (data.requiresVerification) {
        setOtpEmail(data.email || email.trim());
        setIsVerifyingOtp(true);
        setResendCooldown(60);
        if (data.devOtp) setDevOtpHint(data.devOtp);
        setSuccessMsg(data.message || "Please enter the verification code sent to your email.");
        if (data.emailDelivery && !data.emailDelivery.success) {
          setWarningMsg(
            `Notice: Email delivery unavailable (${data.emailDelivery.error || "Provider not configured"}). Use verification code shown.`
          );
        }
        return;
      }

      // Success -> Redirect based on role or destination
      const destination = getDestinationUrl(data.user?.role);
      window.location.href = destination;
    } catch {
      setErrorMsg("Network error connecting to auth service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // User Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
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

      setOtpEmail(data.email || email.trim());
      setIsVerifyingOtp(true);
      setResendCooldown(60);
      if (data.devOtp) setDevOtpHint(data.devOtp);
      setSuccessMsg(data.message || "Account created! Enter the 6-digit verification code to complete activation.");
      if (data.emailDelivery && !data.emailDelivery.success) {
        setWarningMsg(
          `Notice: Email delivery unavailable (${data.emailDelivery.error || "Provider not configured"}). Use verification code shown.`
        );
      }
    } catch {
      setErrorMsg("Network error connecting to registration service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification Submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || otpCode.trim().length < 6) return;

    setLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, otp: otpCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Invalid verification code.");
        return;
      }

      setSuccessMsg("Email successfully verified! Opening your workspace...");
      const destination = getDestinationUrl(data.user?.role);
      setTimeout(() => {
        window.location.href = destination;
      }, 600);
    } catch {
      setErrorMsg("Failed to communicate with verification service.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Action
  const handleResendOtp = async () => {
    if (isResending || resendCooldown > 0) return;

    setIsResending(true);
    setErrorMsg(null);
    setWarningMsg(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to resend code.");
        if (data.retryAfter) {
          setResendCooldown(data.retryAfter);
        }
        return;
      }

      setResendCooldown(data.retryAfter || 60);
      if (data.devOtp) setDevOtpHint(data.devOtp);
      setSuccessMsg(data.message || "A new verification code has been dispatched.");
      if (data.emailDelivery && !data.emailDelivery.success) {
        setWarningMsg(
          `Notice: Email delivery unavailable (${data.emailDelivery.error || "Provider not configured"}). Use verification code shown.`
        );
      }
    } catch {
      setErrorMsg("Network error requesting new verification code.");
    } finally {
      setIsResending(false);
    }
  };

  // Google OAuth Login
  const submitGoogleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail.trim(),
          name: googleName.trim(),
          preferredLanguage: selectedLanguage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Google authentication failed.");
        setShowGoogleModal(false);
        return;
      }

      setShowGoogleModal(false);
      const destination = getDestinationUrl(data.user?.role);
      window.location.href = destination;
    } catch {
      setErrorMsg("Failed to connect with Google authentication service.");
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
            id="auth-language-select"
            aria-label="Select Application Language"
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

        {/* Error / Warning / Success Alerts */}
        {errorMsg && (
          <div
            id="auth-error-alert"
            role="alert"
            className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {warningMsg && (
          <div
            id="auth-warning-alert"
            role="status"
            className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{warningMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            id="auth-success-alert"
            role="status"
            className="mb-5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* OTP Verification Screen */}
        {isVerifyingOtp ? (
          <form id="otp-verification-form" onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Verify Your Email</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter the 6-digit verification code sent to <span className="font-mono font-semibold">{otpEmail}</span>
              </p>
              {devOtpHint && (
                <div
                  id="dev-otp-display"
                  className="mt-2.5 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-xs flex items-center justify-center gap-2"
                >
                  <span>Verification Code (Dev Mode):</span>
                  <span className="font-bold text-sm tracking-wider">{devOtpHint}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="otp-input" className="block text-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                6-Digit Security Code
              </label>
              <input
                id="otp-input"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
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
              id="verify-otp-submit-btn"
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? "Verifying..." : "Verify & Open Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Resend OTP Button & Countdown */}
            <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
              <button
                id="resend-otp-btn"
                type="button"
                onClick={handleResendOtp}
                disabled={isResending || resendCooldown > 0}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline font-medium transition-opacity"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
                <span>
                  {isResending
                    ? "Dispatching code..."
                    : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend verification code"}
                </span>
              </button>

              <button
                id="back-to-auth-btn"
                type="button"
                onClick={() => {
                  setIsVerifyingOtp(false);
                  setErrorMsg(null);
                  setWarningMsg(null);
                }}
                className="text-center text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mt-1"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Tab Switcher: Login / Create Account */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 mb-6 text-xs font-semibold">
              <button
                id="auth-tab-login"
                type="button"
                onClick={() => handleTabSwitch("login")}
                className={`py-2 rounded-xl transition-all ${
                  tab === "login"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Log In
              </button>
              <button
                id="auth-tab-signup"
                type="button"
                onClick={() => handleTabSwitch("signup")}
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
              id="google-login-btn"
              type="button"
              onClick={() => setShowGoogleModal(true)}
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
              <form id="login-form" onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="username email"
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
                    <label htmlFor="login-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  <span>{loading ? "Authenticating..." : "Log In to Typnex"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form id="signup-form" onSubmit={handleSignup} className="space-y-3">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="signup-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Sarah Connor"
                      className="w-full pl-10 pr-4 py-2 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
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
                    <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm
                    </label>
                    <input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-3 py-2 rounded-xl glass-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  id="signup-submit-btn"
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
                id="staff-login-link"
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

      {/* Accessible Google Profile Modal (Non-blocking) */}
      {showGoogleModal && (
        <div
          id="google-auth-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              aria-label="Close Google Login Modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Sign In with Google</h4>
                <p className="text-[11px] text-slate-500">Fast authentic Google OAuth session</p>
              </div>
            </div>

            <form onSubmit={submitGoogleLogin} className="space-y-3">
              <div>
                <label htmlFor="google-email-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Account Email
                </label>
                <input
                  id="google-email-input"
                  name="googleEmail"
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="google-name-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Name
                </label>
                <input
                  id="google-name-input"
                  name="googleName"
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="google-modal-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-colors"
                >
                  {loading ? "Connecting..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthPage;
