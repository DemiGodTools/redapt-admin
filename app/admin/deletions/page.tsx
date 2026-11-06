"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

// Professional Clean SVG Icons (Zero Emojis)
const Icons = {
  ArrowLeft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  UserX: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Calendar: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Clock: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Refresh: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
  ShieldCheck: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>,
  Trash2: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
};

interface IDeletionUser {
  _id: string;
  name: string;
  email: string;
  userId: string;
  deletionStatus: string;
  deletionScheduledAt: string;
  deletionToken: string;
  remainingMs: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDeletionsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<IDeletionUser[]>([]);
  const [stats, setStats] = useState<{ totalPending: number; totalActive: number }>({
    totalPending: 0,
    totalActive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Requests with search and date filters
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/deletions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch deletion requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("adminRole");
    const accessData = localStorage.getItem("adminAccess");
    if (role === "team_member") {
      let isRestricted = true;
      if (accessData) {
        try {
          const access = JSON.parse(accessData);
          if (access.dashboard === "view" || access.dashboard === "edit") {
            isRestricted = false;
          }
        } catch (e) {}
      }
      if (isRestricted) {
        router.replace("/admin/restricted?reason=restrict&module=dashboard");
      }
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate]);

  // Handle Cancel Deletion (Restore user)
  const handleCancel = async (user: IDeletionUser) => {
    if (!confirm(`Are you sure you want to restore account access for ${user.email}? This will cancel the deletion request.`)) {
      return;
    }
    setActionLoadingId(user._id);
    try {
      const res = await fetch("/api/admin/deletions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, action: "cancel" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchRequests();
      } else {
        alert(data.message || "Failed to cancel deletion");
      }
    } catch {
      alert("Network error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Force Purge Immediately
  const handleForcePurge = async (user: IDeletionUser) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${user.email} immediately?\n\nThis will permanently wipe the user document and anonymize all community comments.`
      )
    ) {
      return;
    }
    setActionLoadingId(user._id);
    try {
      const res = await fetch("/api/admin/deletions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, action: "purge" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchRequests();
      } else {
        alert(data.message || "Failed to purge user");
      }
    } catch {
      alert("Network error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Copy tracking link
  const copyTrackingLink = (token: string, id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/delete-account?token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper to format remaining time
  const formatRemaining = (targetIso: string) => {
    if (!targetIso) return "00h 00m";
    const diff = new Date(targetIso).getTime() - Date.now();
    if (diff <= 0) return "Expired (Ready to purge)";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m remaining`;
  };

  // Format Date and Time
  const formatDateTime = (isoString: string) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return `${d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} at ${d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  };

  return (
    <AdminSidebar>
      <div style={styles.container}>
        {/* Navigation Breadcrumb & Back Link */}
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#9ca3af",
              fontSize: 13,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            <Icons.ArrowLeft /> Back to Dashboard
          </Link>
        </div>

        {/* Clean Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Account Deletion Requests</h1>
            <p style={styles.subtitle}>
              Monitor incoming account deletion requests, track the 48-hour recovery countdown, or restore user profiles.
            </p>
          </div>
          <button style={styles.refreshBtn} onClick={fetchRequests} disabled={loading}>
            <Icons.Refresh /> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Exact 2 Clean Status Cards Requested */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statIconWrapAmber}>
              <Icons.UserX />
            </div>
            <div>
              <div style={styles.statNum}>{stats.totalPending}</div>
              <div style={styles.statLabel}>Pending Requests</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconWrapTeal}>
              <Icons.Users />
            </div>
            <div>
              <div style={styles.statNum}>{stats.totalActive.toLocaleString()}</div>
              <div style={styles.statLabel}>Total Active Users</div>
            </div>
          </div>
        </div>

        {/* Search & Date Filter Bar */}
        <div style={styles.filterRow}>
          <div style={styles.searchWrap}>
            <div style={{ color: "#6b7280", display: "flex", alignItems: "center" }}>
              <Icons.Search />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or @userId..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13 }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={styles.dateFilterGroup}>
            <div style={styles.datePickerWrap}>
              <span style={styles.datePickerLabel}>From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <div style={styles.datePickerWrap}>
              <span style={styles.datePickerLabel}>To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                style={styles.clearDateBtn}
              >
                Reset Dates
              </button>
            )}
          </div>
        </div>

        {/* Requests Table */}
        <div style={styles.tableCard}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>
              Loading deletion requests...
            </div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={styles.emptyIconWrap}>
                <Icons.ShieldCheck />
              </div>
              <h3 style={{ fontSize: 16, color: "#fff", margin: "12px 0 4px 0", fontWeight: 600 }}>
                No Pending Deletion Requests
              </h3>
              <p style={{ color: "#6b7280", margin: 0, fontSize: 13 }}>
                {search || startDate || endDate
                  ? "No requests match your search or date filter."
                  : "All accounts are in good standing."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>User Account</th>
                    <th style={styles.th}>Request Time</th>
                    <th style={styles.th}>Purge Scheduled</th>
                    <th style={styles.th}>Time Remaining</th>
                    <th style={styles.th}>Tracking Portal Link</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((u) => {
                    const isActing = actionLoadingId === u._id;
                    return (
                      <tr key={u._id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>{u.name || "User"}</div>
                          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{u.email}</div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>@{u.userId}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#d1d5db" }}>
                            <Icons.Clock />
                            <span>{formatDateTime(u.updatedAt || u.createdAt)}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 500 }}>
                            {formatDateTime(u.deletionScheduledAt)}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.countdownBadge}>
                            {formatRemaining(u.deletionScheduledAt)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {u.deletionToken ? (
                            <button
                              onClick={() => copyTrackingLink(u.deletionToken, u._id)}
                              style={styles.copyBtn}
                            >
                              {copiedId === u._id ? (
                                <>
                                  <Icons.Check /> Copied
                                </>
                              ) : (
                                <>
                                  <Icons.Copy /> Copy Link
                                </>
                              )}
                            </button>
                          ) : (
                            <span style={{ color: "#6b7280", fontSize: 12 }}>None</span>
                          )}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <button
                              onClick={() => handleCancel(u)}
                              disabled={isActing}
                              style={styles.restoreBtn}
                              title="Restore user account and cancel deletion"
                            >
                              <Icons.ShieldCheck />
                              <span>{isActing ? "..." : "Restore"}</span>
                            </button>
                            <button
                              onClick={() => handleForcePurge(u)}
                              disabled={isActing}
                              style={styles.purgeBtn}
                              title="Permanently delete user now"
                            >
                              <Icons.Trash2 />
                              <span>Purge</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminSidebar>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "32px",
    backgroundColor: "#050811",
    minHeight: "100vh",
    flex: 1,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
    margin: 0,
    maxWidth: 640,
    lineHeight: 1.5,
  },
  refreshBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#111827",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "18px 22px",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  statIconWrapAmber: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    color: "#f59e0b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statIconWrapTeal: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    color: "#00D2B4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statNum: {
    fontSize: 24,
    fontWeight: 700,
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
    fontWeight: 500,
  },
  filterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  searchWrap: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#111827",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 42,
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: 13,
    outline: "none",
  },
  dateFilterGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  datePickerWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111827",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "0 10px",
    height: 42,
  },
  datePickerLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: 500,
  },
  dateInput: {
    background: "transparent",
    border: "none",
    color: "#e5e7eb",
    fontSize: 12,
    outline: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    colorScheme: "dark",
  },
  clearDateBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#9ca3af",
    borderRadius: 8,
    padding: "0 12px",
    height: 42,
    fontSize: 12,
    cursor: "pointer",
  },
  tableCard: {
    backgroundColor: "#111827",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  tableHeaderRow: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  th: {
    padding: "12px 18px",
    fontSize: 11,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tr: {
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  td: {
    padding: "14px 18px",
    verticalAlign: "middle",
  },
  countdownBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    display: "inline-block",
  },
  copyBtn: {
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#d1d5db",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  restoreBtn: {
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    border: "1px solid rgba(0, 210, 180, 0.25)",
    color: "#00D2B4",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  purgeBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    color: "#ef4444",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 210, 180, 0.1)",
    color: "#00D2B4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
  },
};
