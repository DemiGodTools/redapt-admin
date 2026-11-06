"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface DeletionStatusData {
  status: "ACTIVE" | "PENDING_DELETION" | "NOT_FOUND";
  email?: string;
  name?: string;
  scheduledAt?: string | null;
  remainingMs?: number;
  token?: string | null;
  reason?: string;
  message?: string;
}

interface AuthenticatedUser {
  _id?: string;
  name: string;
  email: string;
  image?: string | null;
  deletionStatus: "ACTIVE" | "PENDING_DELETION";
  scheduledAt?: string | null;
  token?: string | null;
  remainingMs?: number;
}

interface GoogleAccountsId {
  initialize: (config: Record<string, unknown>) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  prompt: () => void;
}

interface WindowWithGoogle {
  google?: {
    accounts?: {
      id?: GoogleAccountsId;
    };
  };
}

interface ReasonOption {
  id: string;
  title: string;
  subtitle: string;
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    id: "no_longer_using",
    title: "I no longer use the Readapt application",
    subtitle: "I have finished reading or do not need the app anymore",
  },
  {
    id: "privacy_concerns",
    title: "Data privacy & security considerations",
    subtitle: "I want all my stored reading history and personal records erased",
  },
  {
    id: "alternative_service",
    title: "Switching to an alternative platform",
    subtitle: "Using a different reading, eBook, or audiobook platform",
  },
  {
    id: "technical_issues",
    title: "Experienced technical issues or bugs",
    subtitle: "App crashes, reading progress sync errors, or audio narration glitches",
  },
  {
    id: "too_many_notifications",
    title: "Too many notifications / digital detox",
    subtitle: "Reducing screen time and unwanted reading reminders",
  },
  {
    id: "fresh_start",
    title: "Starting fresh with a new account",
    subtitle: "Wiping existing progress, bookmarks, and streaks to restart",
  },
  {
    id: "pricing_content",
    title: "Catalog or subscription preferences",
    subtitle: "Preferred book titles or audiobooks were not available",
  },
  {
    id: "other",
    title: "Other reason",
    subtitle: "I would like to describe my reason in the notes below",
  },
];

// Clean SVGs (Zero glow, high vibrancy)
const Icons = {
  Google: () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"
      />
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D2B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  ChevronDown: ({ rotated }: { rotated?: boolean }) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9ca3af"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: rotated ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D2B4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Copy: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Trash2: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
};

function DeleteAccountContent() {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");
  const urlEmail = searchParams.get("email");

  // Authentication & User State
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [googleAuthLoading, setGoogleAuthLoading] = useState<boolean>(false);
  const [googleClientReady, setGoogleClientReady] = useState<boolean>(false);

  // Form States
  const [nameInput, setNameInput] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<ReasonOption | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<string>("");
  const [acknowledgeTerms, setAcknowledgeTerms] = useState<boolean>(false);

  // Tracking / Status States
  const [token, setToken] = useState<string>("");
  const [emailQuery, setEmailQuery] = useState<string>("");
  const [statusData, setStatusData] = useState<DeletionStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Manual lookup fallback tab
  const [showManualLookup, setShowManualLookup] = useState<boolean>(false);
  const [manualEmailInput, setManualEmailInput] = useState<string>("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize: Check URL token/email or localStorage
  useEffect(() => {
    let activeToken = urlToken || "";
    let activeEmail = urlEmail || "";

    if (!activeToken && typeof window !== "undefined") {
      activeToken = localStorage.getItem("readapt_deletion_token") || "";
    }
    if (!activeEmail && typeof window !== "undefined") {
      activeEmail = localStorage.getItem("readapt_deletion_email") || "";
    }

    if (activeToken || activeEmail) {
      if (activeToken) setToken(activeToken);
      if (activeEmail) {
        setEmailQuery(activeEmail);
        setManualEmailInput(activeEmail);
      }
      fetchStatus(activeToken, activeEmail);
    } else {
      setLoading(false);
    }
  }, [urlToken, urlEmail]);

  // Load Google Identity Services SDK
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('[Google Auth] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.');
    }

    const initializeGoogle = () => {
      const gWindow = window as unknown as WindowWithGoogle;
      if (typeof window === "undefined" || !gWindow.google?.accounts?.id) return;

      try {
        gWindow.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        setGoogleClientReady(true);

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          gWindow.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "filled_black",
            size: "large",
            shape: "rectangular",
            text: "continue_with",
            width: 320,
            logo_alignment: "left",
          });
        }
      } catch (err) {
        console.warn("[GSI Initialization Error]", err);
      }
    };

    if (typeof window !== "undefined") {
      const gWindow = window as unknown as WindowWithGoogle;
      if (gWindow.google?.accounts?.id) {
        initializeGoogle();
      } else {
        const scriptId = "google-gsi-client-script";
        let script = document.getElementById(scriptId) as HTMLScriptElement | null;
        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          script.onload = () => initializeGoogle();
          document.body.appendChild(script);
        } else {
          script.onload = () => initializeGoogle();
        }
      }
    }
  }, [authUser, statusData]);

  // Handle Google Credential Response
  const handleGoogleCredentialResponse = async (response: { credential?: string }) => {
    const idToken = response?.credential;
    if (!idToken) {
      setMessage({ text: "Failed to obtain Google authentication token.", type: "error" });
      return;
    }

    setGoogleAuthLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/deletion/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        const u: AuthenticatedUser = data.user;
        setAuthUser(u);
        setNameInput(u.name || "");
        setEmailQuery(u.email);

        if (u.deletionStatus === "PENDING_DELETION") {
          setStatusData({
            status: "PENDING_DELETION",
            email: u.email,
            name: u.name,
            scheduledAt: u.scheduledAt,
            remainingMs: u.remainingMs,
            token: u.token,
          });
          if (u.token && typeof window !== "undefined") {
            localStorage.setItem("readapt_deletion_token", u.token);
            localStorage.setItem("readapt_deletion_email", u.email);
          }
        } else {
          // ACTIVE user ready to fill deletion form
          setStatusData(null);
        }
      } else if (data.notRegistered) {
        setMessage({
          text: data.message || `No Readapt account is linked to this Google email.`,
          type: "error",
        });
      } else {
        setMessage({ text: data.message || "Authentication failed. Please try again.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error during Google sign-in. Please try again.", type: "error" });
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  // Real-time Countdown Timer
  useEffect(() => {
    if (!statusData || statusData.status !== "PENDING_DELETION" || !statusData.scheduledAt) {
      setTimeLeft(null);
      return;
    }

    const targetTime = new Date(statusData.scheduledAt).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setStatusData((prev) => (prev ? { ...prev, status: "NOT_FOUND" } : null));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [statusData]);

  // Fetch Deletion Status by Token or Email
  const fetchStatus = async (tok?: string, eml?: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (tok) params.set("token", tok);
      if (eml) params.set("email", eml.trim().toLowerCase());

      const res = await fetch(`/api/user/deletion/status?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setStatusData(data);
        if (data.token && typeof window !== "undefined") {
          localStorage.setItem("readapt_deletion_token", data.token);
        }
        if (eml && typeof window !== "undefined") {
          localStorage.setItem("readapt_deletion_email", eml.trim().toLowerCase());
        }
      } else {
        setMessage({ text: data.message || "No deletion request found for this account.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Submit Deletion Request from the Web Form
  const handleSubmitDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.email) {
      setMessage({ text: "Please sign in with your Google account first.", type: "error" });
      return;
    }
    if (!nameInput.trim()) {
      setMessage({ text: "Please enter your name.", type: "error" });
      return;
    }
    if (!selectedReason) {
      setMessage({ text: "Please select a reason from the dropdown menu.", type: "error" });
      return;
    }
    if (!acknowledgeTerms) {
      setMessage({ text: "Please confirm that you understand your data will be permanently scheduled for deletion.", type: "error" });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const payload = {
        email: authUser.email,
        name: nameInput.trim(),
        reason: selectedReason.title,
        details: explanation.trim(),
        source: "web",
      };

      const res = await fetch("/api/user/deletion/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        const newToken = data.deletionToken || null;
        const newScheduledAt = data.scheduledAt;

        if (newToken && typeof window !== "undefined") {
          localStorage.setItem("readapt_deletion_token", newToken);
          localStorage.setItem("readapt_deletion_email", authUser.email);
        }

        setToken(newToken || "");
        setStatusData({
          status: "PENDING_DELETION",
          email: authUser.email,
          name: nameInput.trim(),
          scheduledAt: newScheduledAt,
          token: newToken,
          reason: selectedReason.title,
        });

        setMessage({
          text: "Your account deletion request has been successfully recorded. A 48-hour grace period is now active.",
          type: "success",
        });
      } else {
        setMessage({ text: data.message || "Failed to schedule account deletion.", type: "error" });
      }
    } catch {
      setMessage({ text: "Server communication error. Please try again.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Deletion Request
  const handleCancelDeletion = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = {};
      const activeTok = statusData?.token || token;
      const activeEml = statusData?.email || emailQuery || authUser?.email;

      if (activeTok) payload.token = activeTok;
      if (activeEml) payload.email = activeEml.trim().toLowerCase();

      const res = await fetch("/api/user/deletion/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("readapt_deletion_token");
          localStorage.removeItem("readapt_deletion_email");
        }
        setStatusData({
          status: "ACTIVE",
          email: data.email || activeEml,
        });
        if (authUser) {
          setAuthUser((prev) => (prev ? { ...prev, deletionStatus: "ACTIVE", scheduledAt: null, token: null } : null));
        }
        setMessage({
          text: "Your deletion request has been cancelled! Your account is active, safe, and fully accessible in the Readapt app.",
          type: "success",
        });
      } else {
        setMessage({ text: data.message || "Could not cancel deletion.", type: "error" });
      }
    } catch {
      setMessage({ text: "Server error while cancelling deletion.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Deletion Reference Token
  const handleCopyToken = () => {
    const activeToken = statusData?.token || token;
    if (!activeToken) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(activeToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2200);
    }
  };

  // Manual Email Lookup Submit
  const handleManualLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmailInput.trim()) {
      setMessage({ text: "Please enter your registered email address.", type: "error" });
      return;
    }
    setEmailQuery(manualEmailInput.trim().toLowerCase());
    fetchStatus(token || undefined, manualEmailInput.trim().toLowerCase());
  };

  // Reset to Sign In view
  const handleSignOut = () => {
    setAuthUser(null);
    setStatusData(null);
    setMessage(null);
    setSelectedReason(null);
    setExplanation("");
    setAcknowledgeTerms(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("readapt_deletion_token");
      localStorage.removeItem("readapt_deletion_email");
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.badgeRow}>
          <span style={styles.brandBadge}>READAPT ACCOUNT PORTAL</span>
          <span style={styles.complianceBadge}>GOOGLE PLAY COMPLIANT</span>
        </div>
        <h1 style={styles.title}>Account & Data Deletion Portal</h1>
        <p style={styles.subtitle}>
          Secure identity verification, deletion scheduling, and privacy protection for Readapt readers.
        </p>
      </header>

      {/* Main Action Card */}
      <main style={styles.card}>
        {loading ? (
          <div style={styles.centerBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Verifying account status...</p>
          </div>
        ) : statusData && statusData.status === "PENDING_DELETION" ? (
          /* ═════════════════════════════════════════════════════════════
             STATE 1: SUBMITTED / PENDING DELETION (48-HOUR GRACE PERIOD)
             ═════════════════════════════════════════════════════════════ */
          <div>
            <div style={styles.pendingHeader}>
              <div style={styles.statusBadgeWarning}>
                <span style={styles.warningDot} />
                DELETION REQUEST SCHEDULED
              </div>
              <span style={styles.graceTag}>48-Hour Recovery Window</span>
            </div>

            <div style={styles.timerSection}>
              <div style={styles.timerGrid}>
                <div style={styles.timerBox}>
                  <span style={styles.timerNum}>{timeLeft ? String(timeLeft.hours).padStart(2, "0") : "48"}</span>
                  <span style={styles.timerSub}>Hours</span>
                </div>
                <span style={styles.timerSeparator}>:</span>
                <div style={styles.timerBox}>
                  <span style={styles.timerNum}>{timeLeft ? String(timeLeft.minutes).padStart(2, "0") : "00"}</span>
                  <span style={styles.timerSub}>Minutes</span>
                </div>
                <span style={styles.timerSeparator}>:</span>
                <div style={styles.timerBox}>
                  <span style={styles.timerNum}>{timeLeft ? String(timeLeft.seconds).padStart(2, "0") : "00"}</span>
                  <span style={styles.timerSub}>Seconds</span>
                </div>
              </div>
              <p style={styles.timerDesc}>
                Time remaining before your profile, reading streaks, chapter bookmarks, and preferences are permanently purged.
              </p>
            </div>

            {/* Token Reference Box */}
            {(statusData.token || token) && (
              <div style={styles.tokenCard}>
                <div style={styles.tokenMeta}>
                  <span style={styles.tokenLabel}>Deletion Reference Token</span>
                  <span style={styles.tokenHint}>Save this token to check status or cancel anytime</span>
                </div>
                <div style={styles.tokenRow}>
                  <code style={styles.tokenCode}>{statusData.token || token}</code>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    style={copiedToken ? styles.copiedBtn : styles.copyBtn}
                  >
                    {copiedToken ? (
                      <>
                        <Icons.Check />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Icons.Copy />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Information Grid */}
            <div style={styles.detailsList}>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Target Account</span>
                <span style={styles.detailVal}>{statusData.email || authUser?.email || emailQuery}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Scheduled Purge</span>
                <span style={styles.detailVal}>
                  {statusData.scheduledAt ? new Date(statusData.scheduledAt).toLocaleString() : "In 48 Hours"}
                </span>
              </div>
              {statusData.reason && (
                <div style={styles.detailRow}>
                  <span style={styles.detailKey}>Reason Cited</span>
                  <span style={styles.detailVal}>{statusData.reason}</span>
                </div>
              )}
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Public Comments</span>
                <span style={styles.detailVal}>Anonymized as &ldquo;Anonymous Reader&rdquo;</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Scope of Purge</span>
                <span style={styles.detailVal}>Profile, Streaks, Bookmarks, Audio Positions</span>
              </div>
            </div>

            {/* Cancellation Call to Action */}
            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                style={styles.cancelActionBtn}
                disabled={actionLoading}
                onClick={handleCancelDeletion}
              >
                {actionLoading ? "Cancelling Deletion..." : "Cancel Deletion Request & Keep Account"}
              </button>
              <p style={styles.subtextCenter}>
                Changed your mind? You can cancel your deletion request before the timer runs out.
              </p>
            </div>
          </div>
        ) : statusData && statusData.status === "ACTIVE" ? (
          /* ═════════════════════════════════════════════════════════════
             STATE 2: ACTIVE & SAFE CONFIRMATION
             ═════════════════════════════════════════════════════════════ */
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={styles.activeIconBox}>
              <Icons.ShieldCheck />
            </div>
            <h2 style={styles.cardHeading}>Your Account is Active & Safe</h2>
            <p style={styles.cardParagraph}>
              The account for <strong style={{ color: "#ffffff" }}>{statusData.email || authUser?.email || emailQuery}</strong> has no pending deletion.
              All your reading history, streaks, and bookmarks are preserved.
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button
                type="button"
                style={styles.outlineBtn}
                onClick={() => {
                  setStatusData(null);
                  setAuthUser(null);
                  setEmailQuery("");
                  setToken("");
                }}
              >
                Start Over
              </button>
            </div>
          </div>
        ) : !authUser ? (
          /* ═════════════════════════════════════════════════════════════
             STATE 3: GOOGLE AUTHENTICATION REQUIRED (STEP 1)
             ═════════════════════════════════════════════════════════════ */
          <div>
            <div style={styles.authHeader}>
              <div style={styles.stepBadge}>STEP 1 OF 2</div>
              <h2 style={styles.cardHeading}>Sign in with your Google Account</h2>
              <p style={styles.cardParagraph}>
                To protect user security and prevent unauthorized deletion requests, please authenticate with the Google account linked to your Readapt mobile application.
              </p>
            </div>

            <div style={styles.googleContainer}>
              {/* Official Google GSI Button mount */}
              <div ref={googleBtnContainerRef} id="google-signin-btn-container" style={styles.googleMount} />

              {/* Fallback custom button if GSI mount is loading */}
              {(!googleClientReady || googleAuthLoading) && (
                <button
                  type="button"
                  style={styles.fallbackGoogleBtn}
                  disabled={googleAuthLoading}
                  onClick={() => {
                    const gWindow = typeof window !== "undefined" ? (window as unknown as WindowWithGoogle) : null;
                    if (gWindow?.google?.accounts?.id) {
                      gWindow.google.accounts.id.prompt();
                    } else {
                      setShowManualLookup(true);
                    }
                  }}
                >
                  <Icons.Google />
                  <span>{googleAuthLoading ? "Verifying Google Account..." : "Continue with Google"}</span>
                </button>
              )}
            </div>

            <div style={styles.infoBanner}>
              <div style={styles.infoBannerIcon}>
                <Icons.Lock />
              </div>
              <div style={styles.infoBannerText}>
                <strong>No app installed?</strong> You do not need the mobile app installed to request deletion. Once authenticated with Google, you will be able to submit your deletion request directly on this page.
              </div>
            </div>

            {/* Existing tracking toggle */}
            <div style={styles.toggleRow}>
              <button
                type="button"
                style={styles.toggleBtn}
                onClick={() => setShowManualLookup(!showManualLookup)}
              >
                {showManualLookup ? "Hide Email Status Lookup" : "Already scheduled a deletion? Check status by email →"}
              </button>
            </div>

            {showManualLookup && (
              <form onSubmit={handleManualLookupSubmit} style={styles.manualForm}>
                <label style={styles.fieldLabel}>Registered Readapt Email</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={manualEmailInput}
                  onChange={(e) => setManualEmailInput(e.target.value)}
                  style={styles.textInput}
                  required
                />
                <button type="submit" style={styles.secondaryBtn} disabled={loading}>
                  {loading ? "Checking Status..." : "Inspect Deletion Status"}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ═════════════════════════════════════════════════════════════
             STATE 4: DELETION REQUEST FORM (STEP 2 - CUSTOM DROPDOWN)
             ═════════════════════════════════════════════════════════════ */
          <div>
            <div style={styles.authHeader}>
              <div style={styles.stepBadge}>STEP 2 OF 2</div>
              <h2 style={styles.cardHeading}>Account Deletion Request</h2>
              <p style={styles.cardParagraph}>
                Please confirm your details and choose a reason. Your request will enter a 48-hour safety hold before permanent destruction.
              </p>
            </div>

            {/* Authenticated Identity Pill */}
            <div style={styles.userPill}>
              <div style={styles.userPillLeft}>
                {authUser.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={authUser.image} alt={authUser.name} style={styles.avatar} />
                ) : (
                  <div style={styles.avatarFallback}>{authUser.name.charAt(0).toUpperCase()}</div>
                )}
                <div>
                  <div style={styles.userPillName}>{authUser.name}</div>
                  <div style={styles.userPillEmail}>{authUser.email}</div>
                </div>
              </div>
              <button type="button" onClick={handleSignOut} style={styles.switchAccountBtn}>
                Switch Account
              </button>
            </div>

            {/* The Form */}
            <form onSubmit={handleSubmitDeletion} style={{ marginTop: 20 }}>
              {/* Field 1: Name */}
              <div style={styles.formGroup}>
                <label style={styles.fieldLabel}>
                  Full Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your full name"
                  style={styles.textInput}
                  required
                  maxLength={70}
                />
              </div>

              {/* Field 2: Custom Dropdown Menu for Reasons (NOT browser native select) */}
              <div style={styles.formGroup} ref={dropdownRef}>
                <label style={styles.fieldLabel}>
                  Primary Reason for Deletion <span style={{ color: "#ef4444" }}>*</span>
                </label>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setIsDropdownOpen(!isDropdownOpen);
                    } else if (e.key === "Escape") {
                      setIsDropdownOpen(false);
                    }
                  }}
                  style={{
                    ...styles.dropdownTrigger,
                    borderColor: isDropdownOpen ? "#00D2B4" : "rgba(255, 255, 255, 0.14)",
                  }}
                >
                  <span style={selectedReason ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                    {selectedReason ? selectedReason.title : "Select a reason from the menu..."}
                  </span>
                  <Icons.ChevronDown rotated={isDropdownOpen} />
                </div>

                {/* Custom Options Panel */}
                {isDropdownOpen && (
                  <div style={styles.dropdownPanel}>
                    {REASON_OPTIONS.map((opt) => {
                      const isSelected = selectedReason?.id === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setSelectedReason(opt);
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            ...styles.dropdownOption,
                            backgroundColor: isSelected ? "#1c222c" : "transparent",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ ...styles.optionTitle, color: isSelected ? "#00D2B4" : "#ffffff" }}>
                              {opt.title}
                            </div>
                            <div style={styles.optionSubtitle}>{opt.subtitle}</div>
                          </div>
                          {isSelected && <Icons.Check />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Field 3: Textarea for optional explanation */}
              <div style={styles.formGroup}>
                <div style={styles.labelRow}>
                  <label style={styles.fieldLabel}>Additional Explanation (Optional)</label>
                  <span style={styles.charCount}>{explanation.length}/500</span>
                </div>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Tell us what prompted your decision or what we could have done better..."
                  rows={4}
                  maxLength={500}
                  style={styles.textarea}
                />
              </div>

              {/* Acknowledgment Checkbox */}
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={acknowledgeTerms}
                  onChange={(e) => setAcknowledgeTerms(e.target.checked)}
                  style={styles.checkboxInput}
                  required
                />
                <span style={styles.checkboxText}>
                  I understand that submitting this request schedules my profile, streaks, reading milestones, and library records for permanent, irreversible deletion after a 48-hour grace period.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                style={styles.submitDangerBtn}
                disabled={actionLoading}
              >
                <Icons.Trash2 />
                <span>{actionLoading ? "Scheduling Deletion..." : "Request Permanent Account Deletion"}</span>
              </button>
            </form>
          </div>
        )}

        {/* Global Feedback Alert */}
        {message && (
          <div
            style={{
              ...styles.messageBox,
              backgroundColor:
                message.type === "success"
                  ? "rgba(0, 210, 180, 0.08)"
                  : "rgba(239, 68, 68, 0.08)",
              borderColor:
                message.type === "success"
                  ? "#00D2B4"
                  : "#ef4444",
              color:
                message.type === "success"
                  ? "#00D2B4"
                  : "#f87171",
            }}
          >
            {message.type === "error" && <Icons.AlertTriangle />}
            <span>{message.text}</span>
          </div>
        )}
      </main>

      {/* Conditions & Instructions in Small Font (Authentic, Realistic, Google Play Data Safety) */}
      <section style={styles.legalSection}>
        <div style={styles.legalHeader}>
          <Icons.ShieldCheck />
          <h3 style={styles.legalTitle}>
            Account Deletion Conditions & Google Play Data Safety Policy
          </h3>
        </div>

        <div style={styles.legalGrid}>
          <div style={styles.legalItem}>
            <div style={styles.legalNum}>1</div>
            <div>
              <h4 style={styles.legalItemTitle}>48-Hour Recovery Grace Period</h4>
              <p style={styles.legalItemDesc}>
                To protect accounts from accidental loss, unauthorized access, or malicious tampering, all deletion requests are placed in a 48-hour recovery queue. During this hold, your account remains dormant, and you can cancel your request instantly on this page or by signing into the Readapt mobile application. Once the 48-hour timer reaches zero, data destruction commences automatically.
              </p>
            </div>
          </div>

          <div style={styles.legalItem}>
            <div style={styles.legalNum}>2</div>
            <div>
              <h4 style={styles.legalItemTitle}>Scope of Permanent Data Destruction</h4>
              <p style={styles.legalItemDesc}>
                Upon final execution, Readapt permanently purges your user profile, Google authentication identifiers, display name, registered email address, reading streaks, library bookmarks, audio narration listening bookmarks, quiz responses, and cloud preferences from our MongoDB production database and Backblaze B2 storage.
              </p>
            </div>
          </div>

          <div style={styles.legalItem}>
            <div style={styles.legalNum}>3</div>
            <div>
              <h4 style={styles.legalItemTitle}>Preservation of Public Discussion Flow</h4>
              <p style={styles.legalItemDesc}>
                To ensure public chapter discussions and book questions remain coherent for fellow readers, comments you previously submitted will have your personal username, avatar, email, and user IDs stripped and permanently anonymized to &ldquo;Anonymous Reader&rdquo;.
              </p>
            </div>
          </div>

          <div style={styles.legalItem}>
            <div style={styles.legalNum}>4</div>
            <div>
              <h4 style={styles.legalItemTitle}>Google Play Store In-App Subscriptions</h4>
              <p style={styles.legalItemDesc}>
                Deleting your Readapt account does not automatically cancel active subscriptions billed through the Google Play Store. In accordance with Google Play Developer Policies, users must cancel recurring billing directly within the Google Play Store app (Profile &gt; Payments &amp; Subscriptions &gt; Subscriptions) to prevent automatic renewals by Google.
              </p>
            </div>
          </div>

          <div style={styles.legalItem}>
            <div style={styles.legalNum}>5</div>
            <div>
              <h4 style={styles.legalItemTitle}>Regulatory Compliance & Anonymized Records</h4>
              <p style={styles.legalItemDesc}>
                In full alignment with GDPR Article 17 (&ldquo;Right to Erasure&rdquo;), CCPA, and Google Play Data Safety specifications, cryptographically hashed transactional audit markers may be preserved temporarily solely for anti-abuse verification, financial compliance, and legal integrity.
              </p>
            </div>
          </div>

          <div style={styles.legalItem}>
            <div style={styles.legalNum}>6</div>
            <div>
              <h4 style={styles.legalItemTitle}>Data Protection & Privacy Desk</h4>
              <p style={styles.legalItemDesc}>
                If you encounter issues during verification or require a copy of your personal data prior to scheduled destruction, contact our privacy compliance desk directly at <code style={styles.legalCode}>privacy@readapt.app</code> or <code style={styles.legalCode}>support@readapt.app</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <a href="/privacy-policy.txt" target="_blank" rel="noreferrer" style={styles.footerLink}>
          Privacy Policy
        </a>
        <span style={styles.footerDot}>•</span>
        <a href="/terms-and-safety.txt" target="_blank" rel="noreferrer" style={styles.footerLink}>
          Terms of Service &amp; Safety
        </a>
        <span style={styles.footerDot}>•</span>
        <span style={{ color: "#71717a" }}>&copy; 2026 Readapt. All rights reserved.</span>
      </footer>
    </div>
  );
}

export default function DeleteAccountPage() {
  return (
    <Suspense
      fallback={
        <div style={{ backgroundColor: "#090a0f", minHeight: "100vh", padding: 40, color: "#9ca3af", textAlign: "center" }}>
          Loading Account Deletion Portal...
        </div>
      }
    >
      <DeleteAccountContent />
    </Suspense>
  );
}

// Strict Matte Styling (Zero Glow, High Vibrancy, Polished Contrast)
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#090a0e",
    color: "#f3f4f6",
    minHeight: "100vh",
    padding: "48px 16px 64px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  header: {
    textAlign: "center",
    maxWidth: 620,
    marginBottom: 28,
  },
  badgeRow: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  brandBadge: {
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    color: "#00D2B4",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.2,
    padding: "5px 12px",
    borderRadius: 6,
    border: "1px solid rgba(0, 210, 180, 0.3)",
  },
  complianceBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.8,
    padding: "5px 10px",
    borderRadius: 6,
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 30,
    fontWeight: 800,
    color: "#ffffff",
    margin: "0 0 10px 0",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 1.6,
    margin: 0,
  },
  card: {
    backgroundColor: "#11141b",
    border: "1px solid #232836",
    borderRadius: 14,
    padding: 30,
    maxWidth: 580,
    width: "100%",
    boxSizing: "border-box",
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: 700,
    color: "#ffffff",
    margin: "0 0 6px 0",
  },
  cardParagraph: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 1.6,
    margin: 0,
  },
  stepBadge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    color: "#00D2B4",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  authHeader: {
    marginBottom: 20,
  },
  googleContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "24px 0 16px 0",
  },
  googleMount: {
    minHeight: 44,
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },
  fallbackGoogleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    color: "#1f2937",
    fontWeight: 600,
    fontSize: 14,
    padding: "12px 24px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    cursor: "pointer",
    width: "100%",
    maxWidth: 320,
  },
  infoBanner: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#161b24",
    border: "1px solid #262e3d",
    borderRadius: 10,
    padding: "14px 16px",
    marginTop: 16,
  },
  infoBannerIcon: {
    color: "#00D2B4",
    marginTop: 2,
    flexShrink: 0,
  },
  infoBannerText: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 1.55,
  },
  toggleRow: {
    textAlign: "center",
    marginTop: 20,
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 12,
    cursor: "pointer",
    textDecoration: "underline",
    padding: 4,
  },
  manualForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #1e2430",
  },
  userPill: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#161b24",
    border: "1px solid #283243",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 16,
  },
  userPillLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    objectFit: "cover",
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#00D2B4",
    color: "#000",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
  },
  userPillName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#ffffff",
  },
  userPillEmail: {
    fontSize: 12,
    color: "#94a3b8",
  },
  switchAccountBtn: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  formGroup: {
    marginBottom: 18,
    position: "relative",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#e2e8f0",
    marginBottom: 6,
  },
  charCount: {
    fontSize: 11,
    color: "#64748b",
  },
  textInput: {
    width: "100%",
    backgroundColor: "#161b24",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    padding: "11px 14px",
    color: "#ffffff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  // Custom Dropdown Trigger
  dropdownTrigger: {
    width: "100%",
    backgroundColor: "#161b24",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    padding: "11px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    boxSizing: "border-box",
    userSelect: "none",
  },
  dropdownSelectedText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 500,
  },
  dropdownPlaceholder: {
    color: "#64748b",
    fontSize: 14,
  },
  // Custom Dropdown Panel
  dropdownPanel: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#131720",
    border: "1px solid #2d3648",
    borderRadius: 10,
    zIndex: 99,
    maxHeight: 280,
    overflowY: "auto",
    padding: 6,
    boxShadow: "0 14px 28px rgba(0, 0, 0, 0.55)",
  },
  dropdownOption: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 11,
    color: "#71717a",
  },
  textarea: {
    width: "100%",
    backgroundColor: "#161b24",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    padding: "11px 14px",
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 1.5,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  checkboxLabel: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    margin: "18px 0 22px 0",
    cursor: "pointer",
  },
  checkboxInput: {
    marginTop: 3,
    accentColor: "#ef4444",
    width: 16,
    height: 16,
    cursor: "pointer",
  },
  checkboxText: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 1.55,
  },
  submitDangerBtn: {
    width: "100%",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 14,
    padding: "13px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background-color 0.15s ease",
  },
  secondaryBtn: {
    width: "100%",
    backgroundColor: "#1e293b",
    color: "#f1f5f9",
    fontWeight: 600,
    fontSize: 13,
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #334155",
    cursor: "pointer",
    marginTop: 10,
  },
  outlineBtn: {
    backgroundColor: "transparent",
    border: "1px solid #334155",
    color: "#cbd5e1",
    fontWeight: 600,
    fontSize: 13,
    padding: "9px 18px",
    borderRadius: 8,
    cursor: "pointer",
  },
  // Pending State Views
  pendingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadgeWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    fontSize: 11,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  warningDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: "#f59e0b",
  },
  graceTag: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 500,
  },
  timerSection: {
    textAlign: "center",
    margin: "16px 0 24px 0",
  },
  timerGrid: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  timerBox: {
    backgroundColor: "#161b24",
    border: "1px solid #283243",
    borderRadius: 10,
    padding: "12px 16px",
    minWidth: 68,
  },
  timerNum: {
    display: "block",
    fontSize: 28,
    fontWeight: 800,
    color: "#ffffff",
    fontVariantNumeric: "tabular-nums",
  },
  timerSub: {
    fontSize: 10,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: 600,
    marginTop: 2,
    display: "block",
  },
  timerSeparator: {
    fontSize: 22,
    fontWeight: 700,
    color: "#475569",
  },
  timerDesc: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 1.5,
    margin: 0,
  },
  tokenCard: {
    backgroundColor: "#161b24",
    border: "1px solid #283243",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 18,
  },
  tokenMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tokenLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#00D2B4",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tokenHint: {
    fontSize: 10,
    color: "#64748b",
  },
  tokenRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  tokenCode: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#ffffff",
    backgroundColor: "#0d1017",
    padding: "5px 8px",
    borderRadius: 4,
    overflowX: "auto",
    wordBreak: "break-all",
    flex: 1,
  },
  copyBtn: {
    backgroundColor: "#1e293b",
    color: "#f1f5f9",
    border: "1px solid #334155",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  copiedBtn: {
    backgroundColor: "rgba(0, 210, 180, 0.15)",
    color: "#00D2B4",
    border: "1px solid rgba(0, 210, 180, 0.4)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  detailsList: {
    backgroundColor: "#161b24",
    border: "1px solid #283243",
    borderRadius: 8,
    padding: "8px 14px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    fontSize: 12,
  },
  detailKey: {
    color: "#94a3b8",
  },
  detailVal: {
    color: "#ffffff",
    fontWeight: 600,
    textAlign: "right",
  },
  cancelActionBtn: {
    width: "100%",
    backgroundColor: "#00D2B4",
    color: "#000000",
    fontWeight: 700,
    fontSize: 14,
    padding: "13px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },
  subtextCenter: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
  },
  activeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    border: "1px solid rgba(0, 210, 180, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px auto",
  },
  // Conditions / Legal Section (Small font, clean, structured)
  legalSection: {
    backgroundColor: "#0f1219",
    border: "1px solid #1f2533",
    borderRadius: 12,
    padding: 24,
    maxWidth: 580,
    width: "100%",
    marginTop: 24,
    boxSizing: "border-box",
  },
  legalHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #1f2533",
  },
  legalTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#ffffff",
    margin: 0,
    letterSpacing: -0.2,
  },
  legalGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  legalItem: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  legalNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1e2430",
    color: "#00D2B4",
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  legalItemTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#e2e8f0",
    margin: "0 0 3px 0",
  },
  legalItemDesc: {
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 1.6,
    margin: 0,
  },
  legalCode: {
    fontFamily: "monospace",
    backgroundColor: "#161b24",
    padding: "2px 6px",
    borderRadius: 4,
    color: "#00D2B4",
    fontSize: 10,
  },
  // Feedback Messages
  messageBox: {
    marginTop: 16,
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    gap: 10,
    lineHeight: 1.5,
  },
  centerBox: {
    textAlign: "center",
    padding: "36px 0",
  },
  spinner: {
    width: 28,
    height: 28,
    border: "3px solid rgba(255,255,255,0.1)",
    borderTopColor: "#00D2B4",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 14,
  },
  footer: {
    marginTop: 36,
    display: "flex",
    gap: 10,
    alignItems: "center",
    fontSize: 11,
    color: "#64748b",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerDot: {
    color: "#3f3f46",
  },
  footerLink: {
    color: "#94a3b8",
    textDecoration: "none",
  },
};
