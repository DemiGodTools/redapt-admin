"use client";

import React, { useState, useRef } from "react";
import AdminSidebar from "@/components/AdminSidebar";

interface NotificationHistoryItem {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetScreen?: string;
  topic: string;
  status: "SENT" | "FAILED";
  messageId?: string;
  errorMessage?: string;
  sentAt: string;
}

// --- Professional SVG Icon Pack ---
const Icons = {
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Send: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Upload: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Pin: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  ),
  Timer: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M5 3 2 6" />
      <path d="m22 6-3-3" />
      <line x1="10" y1="2" x2="14" y2="2" />
    </svg>
  ),
  Close: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Refresh: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  ChevronDown: ({ rotated = false, size = 14 }: { rotated?: boolean; size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: rotated ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Link: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  History: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  Wifi: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  ),
  Signal: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="16" width="3" height="6" rx="0.8" />
      <rect x="7" y="12" width="3" height="10" rx="0.8" />
      <rect x="12" y="8" width="3" height="14" rx="0.8" />
      <rect x="17" y="4" width="3" height="18" rx="0.8" />
    </svg>
  ),
  Battery: () => (
    <svg width="16" height="13" viewBox="0 0 24 14" fill="none">
      <rect x="1" y="2" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="4.5" width="11" height="5" rx="0.8" fill="currentColor" />
      <path d="M21 5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  ReadaptMark: ({ size = 12, color = "#050811" }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
};

const formatCountdownClock = (totalMins: number, prefix = "Ends in") => {
  const safe = Math.max(0, Number(totalMins) || 0);
  const d = Math.floor(safe / (24 * 60));
  const h = Math.floor((safe % (24 * 60)) / 60);
  const m = safe % 60;
  if (d > 0) {
    return `${prefix} ${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  }
  return `${prefix} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

export default function NotificationsAdminPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetScreen, setTargetScreen] = useState("Home");
  const [targetId, setTargetId] = useState("");
  const [sending, setSending] = useState(false);

  // Advanced Notification Variants (Countdown & Sticky)
  const [isSticky, setIsSticky] = useState(false);
  const [isCountdown, setIsCountdown] = useState(false);
  const [countdownPrefix, setCountdownPrefix] = useState("Launching in");
  const [customPrefix, setCustomPrefix] = useState("");
  const [countdownDays, setCountdownDays] = useState(3);
  const [countdownHours, setCountdownHours] = useState(0);
  const [countdownMins, setCountdownMins] = useState(0);
  const [countdownMode, setCountdownMode] = useState<"duration" | "datetime">("duration");
  const [targetDateTime, setTargetDateTime] = useState("");
  const [includeBadgeInTitle, setIncludeBadgeInTitle] = useState(true);

  // Computed Countdown Values
  const activePrefix = countdownPrefix === "Custom" ? (customPrefix.trim() || "Alert in") : countdownPrefix;

  const totalCountdownMinutes = React.useMemo(() => {
    if (countdownMode === "datetime" && targetDateTime) {
      const diffMs = new Date(targetDateTime).getTime() - Date.now();
      return Math.max(1, Math.round(diffMs / 60000));
    }
    return (Number(countdownDays) || 0) * 1440 + (Number(countdownHours) || 0) * 60 + (Number(countdownMins) || 0);
  }, [countdownMode, targetDateTime, countdownDays, countdownHours, countdownMins]);

  const effectiveCountdownString = React.useMemo(() => {
    const d = Math.floor(totalCountdownMinutes / 1440);
    const h = Math.floor((totalCountdownMinutes % 1440) / 60);
    const m = totalCountdownMinutes % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [totalCountdownMinutes]);

  // Android Preview State (Expanded vs Collapsed)
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true);

  // Targets (Series / Books) Loaded On-Demand
  const [seriesList, setSeriesList] = useState<{ id: string; title: string }[]>([]);
  const [booksList, setBooksList] = useState<{ id: string; title: string; type: string }[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targetsLoaded, setTargetsLoaded] = useState(false);

  // Direct B2 Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History State
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTargetsIfNeeded = async () => {
    if (targetsLoaded || loadingTargets) return;
    setLoadingTargets(true);
    try {
      const res = await fetch("/api/admin/notifications/targets");
      const json = await res.json();
      if (json.success) {
        setSeriesList(json.series || []);
        setBooksList(json.books || []);
        setTargetsLoaded(true);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleTargetScreenChange = (screen: string) => {
    setTargetScreen(screen);
    setTargetId("");
    if (screen === "SeriesOverview" || screen === "ReadBook" || screen === "AudioRdr") {
      loadTargetsIfNeeded();
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/admin/notifications/history");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHistory(json.data);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory && history.length === 0) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image is too large (>2MB). Keep banner images under 1MB for fast push delivery.");
      return;
    }

    setUploadingImage(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "notifications");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setImageUrl(data.url);
      } else {
        setUploadError(data.message || "Failed to upload image to B2.");
      }
    } catch (err: any) {
      setUploadError(err.message || "Network error while uploading image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setToast({ type: "error", text: "Please provide both title and message." });
      return;
    }

    const confirmed = window.confirm(
      `Broadcast this notification to all active devices?\n\nTitle: "${title.trim()}"`
    );
    if (!confirmed) return;

    setSending(true);
    setToast(null);

    const extraData: Record<string, string> = {};
    if (targetId.trim()) {
      if (targetScreen === "SeriesOverview") {
        extraData.seriesId = targetId.trim();
      } else if (targetScreen === "ReadBook" || targetScreen === "AudioRdr") {
        extraData.bookId = targetId.trim();
      }
    }

    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          imageUrl: imageUrl.trim() || undefined,
          targetScreen,
          extraData: Object.keys(extraData).length > 0 ? extraData : undefined,
          isSticky,
          countdownMinutes: isCountdown ? totalCountdownMinutes : undefined,
          countdownPrefix: isCountdown ? activePrefix : undefined,
          includeBadgeInTitle: isCountdown ? includeBadgeInTitle : false,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: "success", text: "Notification broadcast sent successfully to all devices." });
        setTitle("");
        setMessage("");
        setImageUrl("");
        setTargetId("");
        setIsSticky(false);
        setIsCountdown(false);
        if (showHistory) {
          fetchHistory();
        }
      } else {
        setToast({
          type: "error",
          text: data.message || "Failed to broadcast notification.",
        });
      }
    } catch (err: any) {
      setToast({ type: "error", text: err?.message || "Network request failed." });
    } finally {
      setSending(false);
    }
  };

  const selectedTargetTitle =
    targetScreen === "SeriesOverview"
      ? seriesList.find((s) => s.id === targetId)?.title
      : targetScreen === "ReadBook" || targetScreen === "AudioRdr"
      ? booksList.find((b) => b.id === targetId)?.title
      : null;

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px", minHeight: "100vh", backgroundColor: "#050811", color: "#f3f4f6" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          {/* Page Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(0, 210, 180, 0.12)",
                  border: "1px solid rgba(0, 210, 180, 0.25)",
                  color: "#00D2B4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icons.Bell />
              </div>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", margin: 0, letterSpacing: "-0.02em" }}>
                  Push Notification Broadcast
                </h1>
                <p style={{ color: "#9ca3af", fontSize: "13px", margin: "4px 0 0" }}>
                  Send instant FCM notifications to registered Android devices with rich media banners and deep links.
                </p>
              </div>
            </div>
          </div>

          {/* Status Toast */}
          {toast && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "12px",
                marginBottom: "24px",
                backgroundColor: toast.type === "success" ? "rgba(0, 210, 180, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${toast.type === "success" ? "rgba(0, 210, 180, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
                color: toast.type === "success" ? "#00D2B4" : "#f87171",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {toast.type === "success" ? <Icons.CheckCircle /> : <Icons.AlertCircle />}
                <span>{toast.text}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                aria-label="Dismiss notification"
              >
                <Icons.Close />
              </button>
            </div>
          )}

          {/* Main Two-Column Workspace */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(340px, 1fr)", gap: "24px", marginBottom: "28px", alignItems: "start" }}>
            {/* Left Column: Compose Form */}
            <div
              style={{
                backgroundColor: "#111827",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "24px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Compose Broadcast
                </h2>
                <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  FCM Topic: All Devices
                </span>
              </div>

              <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Title */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={labelStyle}>
                      Notification Title <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <span style={{ fontSize: "11px", color: title.length > 50 ? "#f59e0b" : "#6b7280" }}>
                      {title.length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. New Chapter Released: Fact Holic Shorts"
                    style={inputStyle}
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={labelStyle}>
                      Message Body <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <span style={{ fontSize: "11px", color: message.length > 175 ? "#f59e0b" : "#6b7280" }}>
                      {message.length}/200
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Chapter 2 is now live with enhanced audio and deep dive insights. Tap to listen now."
                    style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }}
                    required
                  />
                </div>

                {/* Banner Image Upload + URL Fallback */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={labelStyle}>Banner Image (2:1 Ratio, 1024x512)</label>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>Max 2MB (JPG, PNG, WebP)</span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                  />

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      style={{
                        padding: "9px 14px",
                        backgroundColor: uploadingImage ? "rgba(255,255,255,0.06)" : "rgba(0, 210, 180, 0.12)",
                        border: "1px solid rgba(0, 210, 180, 0.3)",
                        borderRadius: "8px",
                        color: uploadingImage ? "#9ca3af" : "#00D2B4",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: uploadingImage ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <Icons.Upload />
                      <span>{uploadingImage ? "Uploading to B2..." : "Upload Banner"}</span>
                    </button>

                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        style={{
                          padding: "9px 12px",
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: "8px",
                          color: "#ef4444",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Icons.Trash />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {uploadError && (
                    <p style={{ color: "#ef4444", fontSize: "12px", margin: "0 0 8px" }}>{uploadError}</p>
                  )}

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Or paste an external image URL directly..."
                    style={{ ...inputStyle, color: "#d1d5db", fontSize: "13px" }}
                  />
                </div>

                {/* Target Screen */}
                <div>
                  <label style={{ ...labelStyle, display: "block", marginBottom: "6px" }}>
                    Tap Action (Target Screen in App)
                  </label>
                  <select
                    value={targetScreen}
                    onChange={(e) => handleTargetScreenChange(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="Home">Home Feed (Main Screen)</option>
                    <option value="Series">Series & Books Catalog (All Series)</option>
                    <option value="SeriesOverview">Specific Series (Choose from List)</option>
                    <option value="ReadBook">Direct Book Reader (Choose Book)</option>
                    <option value="AudioRdr">Direct Audio Player (Choose Audio Book)</option>
                    <option value="DailyRewards">Daily Rewards & Streak</option>
                    <option value="Subscription">Upgrade / Subscription Plan</option>
                  </select>
                </div>

                {/* Conditional Target Series Selector */}
                {targetScreen === "SeriesOverview" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ ...labelStyle, color: "#00D2B4" }}>Select Target Series</label>
                      {loadingTargets && <span style={{ fontSize: "11px", color: "#00D2B4" }}>Loading series...</span>}
                    </div>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      style={{ ...inputStyle, borderColor: "rgba(0, 210, 180, 0.4)", cursor: "pointer" }}
                      required
                    >
                      <option value="">-- Choose Series Title --</option>
                      {seriesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Conditional Target Book Selector */}
                {(targetScreen === "ReadBook" || targetScreen === "AudioRdr") && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ ...labelStyle, color: "#00D2B4" }}>
                        {targetScreen === "AudioRdr" ? "Select Audio Book" : "Select Reading Book"}
                      </label>
                      {loadingTargets && <span style={{ fontSize: "11px", color: "#00D2B4" }}>Loading books...</span>}
                    </div>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      style={{ ...inputStyle, borderColor: "rgba(0, 210, 180, 0.4)", cursor: "pointer" }}
                      required
                    >
                      <option value="">-- Choose Book Title --</option>
                      {booksList
                        .filter((b) => (targetScreen === "AudioRdr" ? b.type === "audio" : true))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title} [{b.type.toUpperCase()}]
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Advanced Notification Variants */}
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#0b0f19",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Delivery Options
                  </span>

                  {/* Sticky / Ongoing */}
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isSticky}
                      onChange={(e) => setIsSticky(e.target.checked)}
                      style={{ accentColor: "#00D2B4", marginTop: "3px", width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: isSticky ? "#00D2B4" : "#f3f4f6", fontSize: "13px", fontWeight: 600 }}>
                        <Icons.Pin size={14} />
                        <span>Ongoing Sticky Alert (Non-Dismissable)</span>
                      </div>
                      <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#6b7280", lineHeight: "1.4" }}>
                        Stays pinned in the Android notification drawer until the user taps to open it.
                      </p>
                    </div>
                  </label>

                  {/* Countdown Chronometer */}
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isCountdown}
                      onChange={(e) => setIsCountdown(e.target.checked)}
                      style={{ accentColor: "#00D2B4", marginTop: "3px", width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: isCountdown ? "#00D2B4" : "#f3f4f6", fontSize: "13px", fontWeight: 600 }}>
                        <Icons.Timer size={14} />
                        <span>Active Countdown Chronometer</span>
                      </div>
                      <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#6b7280", lineHeight: "1.4" }}>
                        Renders a live ticking Android chronometer for flash sales or streak deadlines.
                      </p>
                    </div>
                  </label>

                  {isCountdown && (
                    <div
                      style={{
                        padding: "14px 16px",
                        backgroundColor: "#070b13",
                        border: "1px solid rgba(0, 210, 180, 0.25)",
                        borderRadius: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                        marginTop: "2px",
                      }}
                    >
                      {/* Timer Prefix Selection */}
                      <div>
                        <label style={{ fontSize: "11.5px", color: "#9ca3af", display: "block", marginBottom: "6px", fontWeight: 600 }}>
                          Timer Prefix Tag:
                        </label>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {[
                            { id: "Launching in", label: "🚀 Launching in" },
                            { id: "Ends in", label: "⏳ Ends in" },
                            { id: "Starts in", label: "🔥 Starts in" },
                            { id: "Available in", label: "⚡ Available in" },
                            { id: "Custom", label: "✏️ Custom..." },
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setCountdownPrefix(p.id)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                border: countdownPrefix === p.id ? "1px solid #00D2B4" : "1px solid rgba(255,255,255,0.08)",
                                backgroundColor: countdownPrefix === p.id ? "rgba(0, 210, 180, 0.15)" : "transparent",
                                color: countdownPrefix === p.id ? "#00D2B4" : "#9ca3af",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>

                        {countdownPrefix === "Custom" && (
                          <input
                            type="text"
                            value={customPrefix}
                            onChange={(e) => setCustomPrefix(e.target.value)}
                            placeholder="e.g. Premieres in, Unlocks in..."
                            style={{ ...inputStyle, marginTop: "8px", padding: "8px 12px", fontSize: "13px" }}
                          />
                        )}
                      </div>

                      {/* Mode Toggle: Duration vs Exact Date/Time */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setCountdownMode("duration")}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            backgroundColor: countdownMode === "duration" ? "rgba(0,210,180,0.15)" : "rgba(255,255,255,0.05)",
                            color: countdownMode === "duration" ? "#00D2B4" : "#9ca3af",
                          }}
                        >
                          Duration (Days / Hours / Mins)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCountdownMode("datetime")}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            backgroundColor: countdownMode === "datetime" ? "rgba(0,210,180,0.15)" : "rgba(255,255,255,0.05)",
                            color: countdownMode === "datetime" ? "#00D2B4" : "#9ca3af",
                          }}
                        >
                          Pick Specific Target Date & Time
                        </button>
                      </div>

                      {countdownMode === "duration" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                          <div>
                            <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>
                              Days
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={countdownDays}
                              onChange={(e) => setCountdownDays(Number(e.target.value))}
                              style={{ ...inputStyle, padding: "8px 10px", textAlign: "center" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>
                              Hours
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={23}
                              value={countdownHours}
                              onChange={(e) => setCountdownHours(Number(e.target.value))}
                              style={{ ...inputStyle, padding: "8px 10px", textAlign: "center" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>
                              Minutes
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={59}
                              value={countdownMins}
                              onChange={(e) => setCountdownMins(Number(e.target.value))}
                              style={{ ...inputStyle, padding: "8px 10px", textAlign: "center" }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>
                            Launch / Expiry Date & Time:
                          </label>
                          <input
                            type="datetime-local"
                            value={targetDateTime}
                            onChange={(e) => setTargetDateTime(e.target.value)}
                            style={{ ...inputStyle, padding: "8px 12px", color: "#FFFFFF" }}
                          />
                        </div>
                      )}

                      {/* Include in Title Checkbox */}
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", paddingTop: "4px" }}>
                        <input
                          type="checkbox"
                          checked={includeBadgeInTitle}
                          onChange={(e) => setIncludeBadgeInTitle(e.target.checked)}
                          style={{ accentColor: "#00D2B4", width: "15px", height: "15px" }}
                        />
                        <span style={{ fontSize: "12px", color: "#D1D5DB" }}>
                          Auto-append timer tag to notification title (e.g. <code>[{activePrefix} {effectiveCountdownString}]</code>)
                        </span>
                      </label>

                      {/* Computed Summary Pill */}
                      <div
                        style={{
                          backgroundColor: "rgba(0, 210, 180, 0.08)",
                          border: "1px dashed rgba(0, 210, 180, 0.3)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "12px",
                          color: "#5EEAD4",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Live Preview Tag:</span>
                        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                          {activePrefix} {effectiveCountdownString} (Total: {totalCountdownMinutes} mins)
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={sending || !title.trim() || !message.trim()}
                  style={{
                    marginTop: "4px",
                    padding: "13px 20px",
                    backgroundColor: sending || !title.trim() || !message.trim() ? "rgba(0, 210, 180, 0.25)" : "#00D2B4",
                    color: sending || !title.trim() || !message.trim() ? "#6b7280" : "#050811",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: sending || !title.trim() || !message.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Icons.Send />
                  <span>{sending ? "Broadcasting to Devices..." : "Send Broadcast to All Users"}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Authentic Android 14/15 Notification Shade Preview */}
            <div
              style={{
                backgroundColor: "#111827",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "14px",
                padding: "24px",
                position: "sticky",
                top: "24px",
              }}
            >
              {/* Preview Header + Mode Toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                    Android Device Preview
                  </h2>
                  <p style={{ fontSize: "12px", color: "#6b7280", margin: "3px 0 0" }}>
                    Material You Dark Shade
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    backgroundColor: "#0b0f19",
                    borderRadius: "8px",
                    padding: "3px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsPreviewExpanded(true)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      backgroundColor: isPreviewExpanded ? "rgba(0, 210, 180, 0.16)" : "transparent",
                      color: isPreviewExpanded ? "#00D2B4" : "#9ca3af",
                    }}
                  >
                    Expanded
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewExpanded(false)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      backgroundColor: !isPreviewExpanded ? "rgba(0, 210, 180, 0.16)" : "transparent",
                      color: !isPreviewExpanded ? "#00D2B4" : "#9ca3af",
                    }}
                  >
                    Collapsed
                  </button>
                </div>
              </div>

              {/* Realistic Android Phone Notification Shade Frame */}
              <div
                style={{
                  backgroundColor: "#0C0E12",
                  borderRadius: "28px",
                  border: "5px solid #1E2430",
                  padding: "12px 14px 18px",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.65)",
                  fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {/* Android Status Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 6px 14px",
                    color: "#E3E3E3",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>1:55</span>
                    <div style={{ opacity: 0.85, display: "flex", alignItems: "center" }}>
                      <Icons.ReadaptMark size={11} color="#E3E3E3" />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#E3E3E3" }}>
                    <Icons.Wifi />
                    <Icons.Signal />
                    <Icons.Battery />
                  </div>
                </div>

                {/* Android Shade Section Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 6px 8px",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "#9AA0A6", letterSpacing: "0.02em" }}>
                    {isSticky ? "Ongoing" : "Notifications"}
                  </span>
                  {isSticky && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#9AA0A6" }}>
                      <Icons.Pin size={10} /> Pinned
                    </span>
                  )}
                </div>

                {/* Authentic Android 14/15 Material You Notification Card */}
                <div
                  style={{
                    backgroundColor: "#202327",
                    borderRadius: "22px",
                    padding: "14px",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isPreviewExpanded ? (
                    <div>
                      {/* Top Row: App Badge + Name + Time / Chronometer + Collapse Chevron */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              backgroundColor: "#00D2B4",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icons.ReadaptMark size={11} color="#050811" />
                          </div>
                          <span style={{ fontSize: "12px", color: "#C4C7C5", fontWeight: 400 }}>Readapt</span>
                          <span style={{ fontSize: "11px", color: "#8E918F" }}>•</span>
                          {isCountdown ? (
                            <span
                              style={{
                                fontSize: "11.5px",
                                color: "#00D2B4",
                                fontWeight: 600,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatCountdownClock(totalCountdownMinutes, activePrefix)}
                            </span>
                          ) : (
                            <span style={{ fontSize: "11.5px", color: "#8E918F" }}>now</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsPreviewExpanded(false)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "#2F3338",
                            border: "none",
                            color: "#C4C7C5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                          title="Collapse preview"
                        >
                          <Icons.ChevronDown rotated={true} size={13} />
                        </button>
                      </div>

                      {/* Title & Body */}
                      <div style={{ paddingLeft: "2px", marginBottom: imageUrl ? "11px" : "2px" }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#E3E3E3",
                            lineHeight: "1.35",
                            marginBottom: "3px",
                            wordBreak: "break-word",
                          }}
                        >
                          {isCountdown && includeBadgeInTitle
                            ? `[${activePrefix} ${effectiveCountdownString}] ${title || "New Chapter Released: Fact Holic Shorts"}`
                            : (title || "New Chapter Released: Fact Holic Shorts")}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#C4C7C5",
                            lineHeight: "1.4",
                            wordBreak: "break-word",
                          }}
                        >
                          {message || "Chapter 2 is now live with enhanced audio and deep dive insights. Tap to listen now."}
                        </div>
                      </div>

                      {/* BigPicture Banner (2:1 Android Aspect Ratio) */}
                      {imageUrl && (
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "2 / 1",
                            borderRadius: "14px",
                            overflow: "hidden",
                            backgroundColor: "#14171A",
                          }}
                        >
                          <img
                            src={imageUrl}
                            alt="Android BigPicture Preview"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/600x300/111827/00D2B4?text=Invalid+Image+URL";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* COLLAPSED ANDROID NOTIFICATION LAYOUT */
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          backgroundColor: "#00D2B4",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icons.ReadaptMark size={14} color="#050811" />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                          <span
                            style={{
                              fontSize: "13.5px",
                              fontWeight: 600,
                              color: "#E3E3E3",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {isCountdown && includeBadgeInTitle
                            ? `[${activePrefix} ${effectiveCountdownString}] ${title || "New Chapter Released: Fact Holic Shorts"}`
                            : (title || "New Chapter Released: Fact Holic Shorts")}
                          </span>
                          <span style={{ fontSize: "11px", color: "#8E918F", flexShrink: 0 }}>
                            • {isCountdown ? formatCountdownClock(countdownMinutes) : "now"}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "12.5px",
                            color: "#C4C7C5",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {message || "Chapter 2 is now live with enhanced audio and deep dive insights."}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        {imageUrl && (
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "10px",
                              overflow: "hidden",
                              backgroundColor: "#14171A",
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt="Thumbnail"
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsPreviewExpanded(true)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: "#2F3338",
                            border: "none",
                            color: "#C4C7C5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                          title="Expand preview"
                        >
                          <Icons.ChevronDown rotated={false} size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Android Shade Bottom Actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "14px",
                    padding: "0 8px",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#6E747B", fontWeight: 500 }}>Manage</span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: isSticky ? "#45494F" : "#C4C7C5",
                      backgroundColor: isSticky ? "transparent" : "#1C1F24",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {isSticky ? "Cannot clear ongoing" : "Clear all"}
                  </span>
                </div>
              </div>

              {/* Clean External Deep-Link Metadata Bar */}
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  backgroundColor: "#0b0f19",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#9ca3af", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Icons.Link /> Deep-Link Destination
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#00D2B4",
                      backgroundColor: "rgba(0, 210, 180, 0.12)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {targetScreen}
                  </span>
                </div>
                {selectedTargetTitle && (
                  <div style={{ fontSize: "12px", color: "#d1d5db", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Target: <strong style={{ color: "#ffffff" }}>{selectedTargetTitle}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Broadcast History Section */}
          <div
            style={{
              backgroundColor: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "20px 24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "9px",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icons.History />
                </div>
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", margin: "0 0 2px" }}>
                    Broadcast Transmission Logs
                  </h2>
                  <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
                    Auto-purged after 30 days via MongoDB TTL to keep database size minimal.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                {showHistory && (
                  <button
                    onClick={fetchHistory}
                    disabled={loadingHistory}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "#d1d5db",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "7px 12px",
                      fontSize: "12px",
                      cursor: loadingHistory ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icons.Refresh />
                    <span>{loadingHistory ? "Refreshing..." : "Refresh"}</span>
                  </button>
                )}
                <button
                  onClick={handleToggleHistory}
                  style={{
                    backgroundColor: showHistory ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 210, 180, 0.12)",
                    color: showHistory ? "#e5e7eb" : "#00D2B4",
                    border: showHistory ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 210, 180, 0.3)",
                    borderRadius: "8px",
                    padding: "7px 14px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{showHistory ? "Hide Logs" : "View Recent Logs"}</span>
                  <Icons.ChevronDown rotated={showHistory} size={13} />
                </button>
              </div>
            </div>

            {showHistory && (
              <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "16px" }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px", color: "#6b7280", fontSize: "13px" }}>
                    {loadingHistory ? "Loading logs from MongoDB..." : "No recent broadcast logs found."}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#9ca3af", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          <th style={{ padding: "10px 12px" }}>Time</th>
                          <th style={{ padding: "10px 12px" }}>Title</th>
                          <th style={{ padding: "10px 12px" }}>Message</th>
                          <th style={{ padding: "10px 12px" }}>Target</th>
                          <th style={{ padding: "10px 12px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr
                            key={item._id}
                            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", color: "#e5e7eb" }}
                          >
                            <td style={{ padding: "12px", whiteSpace: "nowrap", color: "#9ca3af", fontSize: "12px" }}>
                              {new Date(item.sentAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td style={{ padding: "12px", fontWeight: 600, color: "#ffffff", maxWidth: "200px" }}>
                              {item.title}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "#9ca3af",
                                maxWidth: "300px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.body}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  fontSize: "11px",
                                  color: "#00D2B4",
                                  fontWeight: 600,
                                }}
                              >
                                {item.targetScreen || "Home"}
                              </span>
                            </td>
                            <td style={{ padding: "12px" }}>
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  backgroundColor:
                                    item.status === "SENT" ? "rgba(0, 210, 180, 0.14)" : "rgba(239, 68, 68, 0.14)",
                                  color: item.status === "SENT" ? "#00D2B4" : "#f87171",
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminSidebar>
  );
}

// Consistent Admin Theme Styles
const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#9ca3af",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  backgroundColor: "#0b0f19",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "13.5px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};