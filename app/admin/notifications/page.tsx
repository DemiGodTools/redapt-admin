"use client";

import React, { useState, useEffect, useRef } from "react";
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

export default function NotificationsAdminPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetScreen, setTargetScreen] = useState("Home");
  const [targetId, setTargetId] = useState("");
  const [sending, setSending] = useState(false);

  // Direct B2 Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History State
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: "success", text: "🚀 Notification broadcast sent successfully to all devices!" });
        setTitle("");
        setMessage("");
        setImageUrl("");
        setTargetId("");
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

  return (
    <AdminSidebar>
      <div style={{ padding: "32px", minHeight: "100vh", backgroundColor: "#070B0D", color: "#F3F4F6" }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontSize: "24px" }}>🔔</span>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
              Push Notification Broadcast
            </h1>
          </div>
          <p style={{ color: "#9CA3AF", fontSize: "14px", margin: 0 }}>
            Broadcast instant push notifications directly to all registered Android devices with rich banners and deep-link actions.
          </p>
        </div>

        {/* Status Toast */}
        {toast && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "10px",
              marginBottom: "24px",
              backgroundColor: toast.type === "success" ? "rgba(0, 210, 180, 0.15)" : "rgba(239, 68, 68, 0.15)",
              border: `1px solid ${toast.type === "success" ? "#00D2B4" : "#EF4444"}`,
              color: toast.type === "success" ? "#5EEAD4" : "#FCA5A5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <span>{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Two-Column Workspace: Form + Live Phone Mockup Preview */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px", marginBottom: "40px" }}>
          {/* Form Card */}
          <div
            style={{
              backgroundColor: "#11171A",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 18px" }}>
              Compose Notification
            </h2>

            <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Title */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#D1D5DB" }}>
                    Notification Title <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <span style={{ fontSize: "11px", color: "#6B7280" }}>{title.length}/60</span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 🔥 New Chapter Released: Fact Holic Shorts"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    backgroundColor: "#070B0D",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              {/* Message */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#D1D5DB" }}>
                    Message Body <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <span style={{ fontSize: "11px", color: "#6B7280" }}>{message.length}/200</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Chapter 2 is now live with enhanced audio and deep dive insights. Tap to listen now!"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    backgroundColor: "#070B0D",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                  }}
                  required
                />
              </div>

              {/* Direct Image Upload (Backblaze B2) + URL Fallback */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#D1D5DB" }}>
                    Banner Image (2:1 Ratio, e.g. 1024×512)
                  </label>
                  <span style={{ fontSize: "11px", color: "#6B7280" }}>Max 2MB (JPG/PNG/WebP)</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                />

                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{
                      padding: "10px 16px",
                      backgroundColor: "rgba(0, 210, 180, 0.12)",
                      border: "1px solid rgba(0, 210, 180, 0.3)",
                      borderRadius: "10px",
                      color: "#00D2B4",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: uploadingImage ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{uploadingImage ? "⏳ Uploading to B2..." : "📁 Upload Banner Image"}</span>
                  </button>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      style={{
                        padding: "10px 14px",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: "10px",
                        color: "#FCA5A5",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove Image
                    </button>
                  )}
                </div>

                {uploadError && (
                  <p style={{ color: "#EF4444", fontSize: "12px", margin: "4px 0 8px" }}>{uploadError}</p>
                )}

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste external image URL directly..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    backgroundColor: "#070B0D",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    color: "#9CA3AF",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Target Screen Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#D1D5DB", marginBottom: "6px" }}>
                  Tap Action (Target Screen in App)
                </label>
                <select
                  value={targetScreen}
                  onChange={(e) => {
                    setTargetScreen(e.target.value);
                    setTargetId("");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    backgroundColor: "#070B0D",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    color: "#FFFFFF",
                    fontSize: "14px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="Home">Home Feed (Main Screen)</option>
                  <option value="Series">Series & Books Catalog (All Series)</option>
                  <option value="SeriesOverview">Specific Series Overview (Needs Series ID)</option>
                  <option value="ReadBook">Direct Book Reader (Needs Book ID)</option>
                  <option value="AudioRdr">Direct Audio Reader (Needs Book ID)</option>
                  <option value="DailyRewards">Daily Rewards & Streak</option>
                  <option value="Subscription">Upgrade / Subscription Plan</option>
                </select>
              </div>

              {/* Optional Target ID for Deep Linking */}
              {(targetScreen === "SeriesOverview" || targetScreen === "ReadBook" || targetScreen === "AudioRdr") && (
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#5EEAD4", marginBottom: "6px" }}>
                    {targetScreen === "SeriesOverview" ? "Target Series ID" : "Target Book ID"}
                  </label>
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder={targetScreen === "SeriesOverview" ? "e.g. 66df879..." : "e.g. 66e2c34..."}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      backgroundColor: "#070B0D",
                      border: "1px solid rgba(0, 210, 180, 0.4)",
                      borderRadius: "10px",
                      color: "#FFFFFF",
                      fontSize: "13.5px",
                      outline: "none",
                    }}
                    required
                  />
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={sending || !title.trim() || !message.trim()}
                style={{
                  marginTop: "8px",
                  padding: "14px",
                  backgroundColor: sending ? "#0F766E" : "#00D2B4",
                  color: "#070B0D",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: 800,
                  cursor: sending ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "background 0.2s",
                }}
              >
                {sending ? (
                  <span>Broadcasting to Devices...</span>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Send Broadcast to All Users</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Live Android Notification Shade Preview */}
          <div
            style={{
              backgroundColor: "#11171A",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "18px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                Live Android Shade Preview
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#00D2B4",
                  backgroundColor: "rgba(0, 210, 180, 0.12)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                System Shade
              </span>
            </div>

            <p style={{ color: "#9CA3AF", fontSize: "13px", margin: "0 0 16px" }}>
              This simulates how Android devices render the expanded BigPicture notification shade.
            </p>

            {/* Android Notification Card Mockup */}
            <div
              style={{
                backgroundColor: "#1B2226",
                borderRadius: "16px",
                padding: "16px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
              }}
            >
              {/* Header inside Notification: App Icon + App Name + Timestamp */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "6px",
                    backgroundColor: "#00D2B4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 900,
                    color: "#070B0D",
                  }}
                >
                  R
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#F3F4F6" }}>Readapt</span>
                <span style={{ fontSize: "11px", color: "#9CA3AF" }}>• Just now</span>
              </div>

              {/* Title & Body */}
              <div style={{ marginBottom: "12px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 4px" }}>
                  {title || "Notification Title Preview"}
                </h4>
                <p style={{ fontSize: "13.5px", color: "#D1D5DB", margin: 0, lineHeight: 1.45 }}>
                  {message || "Compose a message on the left to preview how your broadcast appears on user lock screens."}
                </p>
              </div>

              {/* Rich Banner Image Preview */}
              {imageUrl ? (
                <div
                  style={{
                    width: "100%",
                    height: "170px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "#070B0D",
                    marginBottom: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <img
                    src={imageUrl}
                    alt="Banner Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/600x300/11171A/00D2B4?text=Invalid+Image+URL";
                    }}
                  />
                </div>
              ) : null}

              {/* Tap action footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  fontSize: "12px",
                  color: "#9CA3AF",
                }}
              >
                <span>Tap action:</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#00D2B4",
                    backgroundColor: "rgba(0, 210, 180, 0.12)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                  }}
                >
                  Open: {targetScreen} {targetId ? `(${targetId.slice(0, 8)}...)` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible History Section (Zero MongoDB Overdraw on Initial Mount) */}
        <div
          style={{
            backgroundColor: "#11171A",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "18px",
            padding: "20px 24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 4px" }}>
                Broadcast Transmission Logs
              </h2>
              <p style={{ color: "#6B7280", fontSize: "13px", margin: 0 }}>
                Auto-purged after 30 days via MongoDB TTL to keep database size minimal.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {showHistory && (
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    color: "#9CA3AF",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {loadingHistory ? "Refreshing..." : "↻ Refresh"}
                </button>
              )}
              <button
                onClick={handleToggleHistory}
                style={{
                  backgroundColor: showHistory ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 210, 180, 0.15)",
                  color: showHistory ? "#D1D5DB" : "#00D2B4",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {showHistory ? "Hide Logs ▲" : "View Recent Logs (15) ▼"}
              </button>
            </div>
          </div>

          {showHistory && (
            <div style={{ marginTop: "18px" }}>
              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#6B7280", fontSize: "13.5px" }}>
                  {loadingHistory ? "Loading logs from MongoDB..." : "No recent broadcast logs found."}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#9CA3AF" }}>
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
                          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", color: "#E5E7EB" }}
                        >
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: "#9CA3AF", fontSize: "12px" }}>
                            {new Date(item.sentAt).toLocaleString()}
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: "#FFFFFF", maxWidth: "200px" }}>
                            {item.title}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#9CA3AF",
                              maxWidth: "300px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.body}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                fontSize: "11px",
                                color: "#00D2B4",
                              }}
                            >
                              {item.targetScreen || "Home"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor:
                                  item.status === "SENT" ? "rgba(0, 210, 180, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                color: item.status === "SENT" ? "#5EEAD4" : "#FCA5A5",
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
    </AdminSidebar>
  );
}
