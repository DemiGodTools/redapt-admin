"use client";

import React, { useState, useEffect } from "react";
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
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [stats, setStats] = useState<{ total: number; fcm: number; expo: number }>({ total: 0, fcm: 0, expo: 0 });
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
      if (json.stats) {
        setStats(json.stats);
      }
    } catch {
      // Ignore network errors on initial mount
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setToast({ type: "error", text: "Please provide both title and message." });
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to broadcast this notification to ALL active users on FCM?\n\nTitle: "${title.trim()}"`
    );
    if (!confirmed) return;

    setSending(true);
    setToast(null);

    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          imageUrl: imageUrl.trim() || undefined,
          targetScreen,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: "success", text: "🚀 Broadcast sent successfully to all users!" });
        setTitle("");
        setMessage("");
        setImageUrl("");
        fetchHistory();
      } else {
        setToast({
          type: "error",
          text: data.message || "Failed to send notification via FCM.",
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
            Broadcast instant Firebase Cloud Messaging (FCM) notifications to all devices subscribed to the{" "}
            <code style={{ color: "#00D2B4", backgroundColor: "rgba(0, 210, 180, 0.12)", padding: "2px 6px", borderRadius: "4px" }}>
              all_users
            </code>{" "}
            topic.
          </p>

          {/* Registered Devices Counter Pill */}
          <div style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
            <div style={{ backgroundColor: "#11171A", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "8px 16px", borderRadius: "10px", fontSize: "13px" }}>
              <span style={{ color: "#9CA3AF" }}>Total Registered Devices: </span>
              <strong style={{ color: "#00D2B4" }}>{stats.total}</strong>
            </div>
            <div style={{ backgroundColor: "#11171A", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "8px 16px", borderRadius: "10px", fontSize: "13px" }}>
              <span style={{ color: "#9CA3AF" }}>Native FCM: </span>
              <strong style={{ color: "#5EEAD4" }}>{stats.fcm}</strong>
            </div>
            <div style={{ backgroundColor: "#11171A", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "8px 16px", borderRadius: "10px", fontSize: "13px" }}>
              <span style={{ color: "#9CA3AF" }}>Expo Clients: </span>
              <strong style={{ color: "#94A3B8" }}>{stats.expo}</strong>
            </div>
          </div>
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
                  rows={4}
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

              {/* Image URL (Optional) */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#D1D5DB", marginBottom: "6px" }}>
                  Banner Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... (JPG/PNG banner for rich notification preview)"
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
                />
              </div>

              {/* Target Screen Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#D1D5DB", marginBottom: "6px" }}>
                  Tap Action (Target Screen in App)
                </label>
                <select
                  value={targetScreen}
                  onChange={(e) => setTargetScreen(e.target.value)}
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
                  <option value="Series">Series & Books Catalog</option>
                  <option value="DailyRewards">Daily Rewards & Streak</option>
                  <option value="Subscription">Upgrade / Subscription Plan</option>
                  <option value="Profile">User Profile</option>
                </select>
              </div>

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
                  <span>Broadcasting to FCM...</span>
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
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 18px" }}>
              Live Mobile Notification Preview
            </h2>

            <div
              style={{
                flex: 1,
                backgroundColor: "#030712",
                borderRadius: "20px",
                padding: "20px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {/* Android Notification Pill Card */}
              <div
                style={{
                  backgroundColor: "rgba(30, 41, 59, 0.8)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "18px",
                  padding: "16px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                }}
              >
                {/* App Row */}
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
                      fontWeight: 900,
                      fontSize: "12px",
                      color: "#070B0D",
                    }}
                  >
                    R
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF" }}>Readapt</span>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>• now</span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    margin: "0 0 4px",
                    lineHeight: 1.3,
                  }}
                >
                  {title.trim() || "Notification Title Preview"}
                </h3>

                {/* Message */}
                <p
                  style={{
                    fontSize: "13px",
                    color: "#CBD5E1",
                    margin: "0 0 10px",
                    lineHeight: 1.4,
                  }}
                >
                  {message.trim() || "Your notification message will appear here in the user's notification bar."}
                </p>

                {/* Optional Banner Image */}
                {imageUrl.trim() && (
                  <div style={{ marginTop: "10px", borderRadius: "10px", overflow: "hidden", maxHeight: "150px" }}>
                    <img
                      src={imageUrl.trim()}
                      alt="Banner Preview"
                      style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
                      onError={(e) => ((e.target as any).style.display = "none")}
                    />
                  </div>
                )}

                {/* Action button tag */}
                <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
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
                    Open: {targetScreen}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Sent Broadcast History Table */}
        <div
          style={{
            backgroundColor: "#11171A",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "18px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
              Broadcast Transmission History
            </h2>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "#9CA3AF",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {loadingHistory ? "Refreshing..." : "↻ Refresh History"}
            </button>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#6B7280", fontSize: "14px" }}>
              No broadcast notifications sent yet. Use the composer above to send your first FCM broadcast!
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "#9CA3AF" }}>
                    <th style={{ padding: "12px 14px" }}>Date & Time</th>
                    <th style={{ padding: "12px 14px" }}>Title</th>
                    <th style={{ padding: "12px 14px" }}>Message</th>
                    <th style={{ padding: "12px 14px" }}>Target</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr
                      key={item._id}
                      style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", color: "#E5E7EB" }}
                    >
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#9CA3AF", fontSize: "12px" }}>
                        {new Date(item.sentAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "#FFFFFF", maxWidth: "220px" }}>
                        {item.title}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          color: "#9CA3AF",
                          maxWidth: "340px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.body}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            fontSize: "12px",
                            color: "#00D2B4",
                          }}
                        >
                          {item.targetScreen || "Home"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
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
      </div>
    </AdminSidebar>
  );
}
