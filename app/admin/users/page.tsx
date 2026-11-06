"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  userId: string;
  image: string | null;
  profileLevel: number;
  levelTitle: string;
  correctAnsStreak: number;
  isLoggedIn: boolean;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  deletionStatus: "ACTIVE" | "PENDING_DELETION";
  deletionScheduledAt: string | null;
  deletionToken: string | null;
  likesCount: number;
  questionsAttemptedCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string | null;
}

interface PaginationInfo {
  total: number;
  activeCount: number;
  loggedInCount: number;
  loggedOutCount: number;
  pendingCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const Icons = {
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Copy: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Clock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Heart: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  HelpCircle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Message: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Flame: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

function UserAvatarCell({ image, name, email }: { image: string | null; name: string; email: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = (name || email || "U").slice(0, 2).toUpperCase();

  const colorIndex = Math.abs(
    (name || email || "U").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % 5;
  const palettes = [
    { bg: "rgba(0, 210, 180, 0.15)", text: "#00D2B4", border: "rgba(0, 210, 180, 0.3)" },
    { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
    { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
    { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
    { bg: "rgba(236, 72, 153, 0.15)", text: "#f472b6", border: "rgba(236, 72, 153, 0.3)" },
  ];
  const p = palettes[colorIndex];

  if (!image || imgFailed) {
    return (
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: p.bg,
          border: `1px solid ${p.border}`,
          color: p.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "13px",
          flexShrink: 0,
        }}
        title={name || email}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={name || "User Avatar"}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setImgFailed(true)}
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        objectFit: "cover",
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        flexShrink: 0,
      }}
    />
  );
}

export default function UsersDirectoryPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    activeCount: 0,
    loggedInCount: 0,
    loggedOutCount: 0,
    pendingCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLevelExplainer, setShowLevelExplainer] = useState(false);

  // Debounce search input by 350ms to prevent heavy queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter,
        sortBy,
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setUsers(json.users);
        setPagination(json.pagination);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, sortBy]);

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
    fetchUsers();
  }, [fetchUsers]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          
          {/* Top Bar with Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <Link
                  href="/admin"
                  style={{
                    color: "#9ca3af",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  <Icons.ArrowLeft /> Back to Dashboard
                </Link>
                <span style={{ color: "#4b5563" }}>/</span>
                <span style={{ color: "#00D2B4", fontSize: "13px", fontWeight: 600 }}>User Management</span>
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
                User Directory & Profiles
              </h1>
              <p style={{ color: "#9ca3af", margin: "6px 0 0", fontSize: "14px" }}>
                Inspect registered users, active session states, levels, streaks, and community contributions.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowLevelExplainer(!showLevelExplainer)}
                style={{
                  backgroundColor: showLevelExplainer ? "rgba(0, 210, 180, 0.15)" : "rgba(255,255,255,0.06)",
                  color: showLevelExplainer ? "#00D2B4" : "#e5e7eb",
                  border: "1px solid",
                  borderColor: showLevelExplainer ? "#00D2B4" : "rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Icons.Info /> What is Level?
              </button>

              <button
                onClick={() => fetchUsers()}
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "#e5e7eb",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Icons.Refresh /> Refresh
              </button>
            </div>
          </div>

          {/* Level Explainer Banner (Toggleable) */}
          {showLevelExplainer && (
            <div style={{
              backgroundColor: "rgba(0, 210, 180, 0.08)",
              border: "1px solid rgba(0, 210, 180, 0.25)",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px"
            }}>
              <div style={{ color: "#00D2B4", marginTop: "2px" }}><Icons.Info /></div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 4px", color: "#fff", fontSize: "14px", fontWeight: 700 }}>
                  Understanding Readapt Reader Tiers & Levels
                </h4>
                <p style={{ margin: 0, color: "#d1d5db", fontSize: "13px", lineHeight: "20px" }}>
                  Every new registered user starts at <strong>Level 1 (Novice)</strong>. As they read chapters, complete quiz modules, and maintain correct answer streaks (≥7 questions streak), their profile promotes across four tiers:
                </p>
                <div style={{ display: "flex", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
                  <span style={levelPillStyle("#9ca3af")}>Lvl 1 · Novice (Starting Tier)</span>
                  <span style={levelPillStyle("#60a5fa")}>Lvl 2 · Scholar (Active Reader)</span>
                  <span style={levelPillStyle("#c084fc")}>Lvl 3 · Awakened (High Engagement)</span>
                  <span style={levelPillStyle("#f59e0b")}>Lvl 4 · Strategist (Master Reader)</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar with Real-Time Session Status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            
            {/* Total Accounts */}
            <div style={metricBoxStyle}>
              <div style={{ color: "#60a5fa" }}><Icons.Users /></div>
              <div>
                <div style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 500 }}>Total Accounts</div>
                <div style={{ fontSize: "22px", color: "#fff", fontWeight: 700 }}>
                  {pagination.total.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Active Users Breakdown */}
            <div style={metricBoxStyle}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981" }} />
              <div>
                <div style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 500 }}>Active Users</div>
                <div style={{ fontSize: "22px", color: "#10b981", fontWeight: 700 }}>
                  {pagination.activeCount.toLocaleString()}
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                  {pagination.loggedInCount} In App · {pagination.loggedOutCount} Inactive
                </div>
              </div>
            </div>

            {/* Currently Logged In */}
            <div style={metricBoxStyle}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#00D2B4", boxShadow: "0 0 10px rgba(0,210,180,0.5)" }} />
              <div>
                <div style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 500 }}>Currently Logged In</div>
                <div style={{ fontSize: "22px", color: "#00D2B4", fontWeight: 700 }}>
                  {pagination.loggedInCount.toLocaleString()}
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                  Active user mobile sessions
                </div>
              </div>
            </div>

            {/* Pending Deletions */}
            <div style={metricBoxStyle}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 500 }}>Pending Deletions</span>
                  {pagination.pendingCount > 0 && (
                    <Link
                      href="/admin/deletions"
                      style={{ fontSize: "11px", color: "#f59e0b", textDecoration: "none", fontWeight: 600 }}
                    >
                      View &rarr;
                    </Link>
                  )}
                </div>
                <div style={{ fontSize: "22px", color: "#f59e0b", fontWeight: 700 }}>
                  {pagination.pendingCount.toLocaleString()}
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                  48-hour recovery countdown
                </div>
              </div>
            </div>

          </div>

          {/* Search & Filter Bar */}
          <div style={{
            backgroundColor: "#111827",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "18px 20px",
            marginBottom: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: "1 1 300px", minWidth: 240 }}>
              <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>
                <Icons.Search />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or user ID..."
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 40px",
                  borderRadius: "8px",
                  backgroundColor: "#0b0f19",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Filters Row */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={selectStyle}
              >
                <option value="all">All Users ({pagination.total})</option>
                <option value="logged_in">Logged In Only ({pagination.loggedInCount})</option>
                <option value="logged_out">Logged Out ({pagination.loggedOutCount})</option>
                <option value="active">Active Only ({pagination.activeCount})</option>
                <option value="pending_deletion">Pending Deletion ({pagination.pendingCount})</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                style={selectStyle}
              >
                <option value="newest">Newest Joined</option>
                <option value="oldest">Oldest Joined</option>
                <option value="streak">Highest Streak</option>
                <option value="name">Name (A-Z)</option>
              </select>

              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                style={selectStyle}
              >
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>

              {(search || statusFilter !== "all" || sortBy !== "newest") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setSortBy("newest");
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: "transparent",
                    color: "#9ca3af",
                    border: "none",
                    fontSize: "12px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* User Cards List / Table */}
          <div style={{ backgroundColor: "#111827", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
                <Icons.Refresh />
                <div style={{ marginTop: "12px", fontSize: "14px" }}>Loading users directory...</div>
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>No users found</div>
                <div style={{ fontSize: "13px", marginTop: "4px" }}>Try tweaking your search term or filter parameters.</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <th style={thStyle}>User Profile</th>
                      <th style={thStyle}>App Status</th>
                      <th style={thStyle}>Reader Tier</th>
                      <th style={thStyle}>Engagement</th>
                      <th style={thStyle}>Community</th>
                      <th style={thStyle}>Joined On</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isPending = u.deletionStatus === "PENDING_DELETION";
                      const initials = (u.name || u.email || "U").slice(0, 2).toUpperCase();

                      return (
                        <tr key={u._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          {/* User Avatar, Name & UserID */}
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <UserAvatarCell image={u.image} name={u.name} email={u.email} />
                                <div>
                                <div style={{ color: "#fff", fontWeight: 600 }}>{u.name}</div>
                                <div style={{ color: "#9ca3af", fontSize: "12px" }}>{u.email}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                  <code style={{ color: "#00D2B4", backgroundColor: "rgba(0,210,180,0.08)", padding: "1px 5px", borderRadius: "3px", fontSize: "10px" }}>
                                    {u.userId || u._id.slice(-6)}
                                  </code>
                                  <button
                                    onClick={() => copyText(u.userId || u._id, u._id)}
                                    title="Copy User ID"
                                    style={{ background: "transparent", border: "none", color: copiedId === u._id ? "#10b981" : "#6b7280", cursor: "pointer", padding: "1px" }}
                                  >
                                    {copiedId === u._id ? <Icons.Check /> : <Icons.Copy />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* App Session & Account Status */}
                          <td style={tdStyle}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {/* Session Pill */}
                              {u.isLoggedIn ? (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  backgroundColor: "rgba(0, 210, 180, 0.15)",
                                  color: "#00D2B4",
                                  border: "1px solid rgba(0, 210, 180, 0.3)",
                                  width: "fit-content"
                                }}>
                                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#00D2B4" }} />
                                  Logged In
                                </span>
                              ) : (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: 500,
                                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                                  color: "#9ca3af",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  width: "fit-content"
                                }}>
                                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#6b7280" }} />
                                  Logged Out
                                </span>
                              )}

                              {/* Deletion Status */}
                              {isPending && (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                                  color: "#f59e0b",
                                  width: "fit-content"
                                }}>
                                  <Icons.Clock /> Scheduled Deletion
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Reader Tier / Level */}
                          <td style={tdStyle}>
                            <div>
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "3px 10px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                backgroundColor: u.profileLevel >= 4 ? "rgba(245, 158, 11, 0.15)" : u.profileLevel >= 2 ? "rgba(96, 165, 250, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                color: u.profileLevel >= 4 ? "#fbbf24" : u.profileLevel >= 2 ? "#60a5fa" : "#e5e7eb",
                              }}>
                                Lvl {u.profileLevel} · {u.levelTitle}
                              </span>
                            </div>
                          </td>

                          {/* Engagement & Streaks */}
                          <td style={tdStyle}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                                color: u.correctAnsStreak > 0 ? "#f59e0b" : "#9ca3af",
                                fontWeight: u.correctAnsStreak > 0 ? 700 : 400
                              }}>
                                <Icons.Flame /> {u.correctAnsStreak} Streak
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#9ca3af" }}>
                                <Icons.HelpCircle /> {u.questionsAttemptedCount} Questions
                              </span>
                            </div>
                          </td>

                          {/* Community (Comments & Likes) */}
                          <td style={tdStyle}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "#9ca3af" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: u.commentsCount > 0 ? "#fff" : "#9ca3af" }}>
                                <Icons.Message /> <strong style={{ color: u.commentsCount > 0 ? "#00D2B4" : "inherit" }}>{u.commentsCount}</strong> Comments
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                                <Icons.Heart /> {u.likesCount} Likes
                              </span>
                            </div>
                          </td>

                          {/* Joined Date */}
                          <td style={tdStyle}>
                            <div style={{ color: "#d1d5db", fontSize: "12px" }}>{formatDateTime(u.createdAt)}</div>
                          </td>

                          {/* Actions */}
                          <td style={tdStyle}>
                            {isPending ? (
                              <Link
                                href="/admin/deletions"
                                style={{
                                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                                  color: "#f59e0b",
                                  padding: "5px 12px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  display: "inline-block"
                                }}
                              >
                                Review Request
                              </Link>
                            ) : (
                              <button
                                onClick={() => copyText(u.email, `email-${u._id}`)}
                                style={{
                                  backgroundColor: "rgba(255,255,255,0.05)",
                                  color: copiedId === `email-${u._id}` ? "#10b981" : "#e5e7eb",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  padding: "5px 12px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  cursor: "pointer"
                                }}
                              >
                                {copiedId === `email-${u._id}` ? "Copied" : "Copy Email"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* High-Performance Pagination Footer */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div style={{ color: "#9ca3af", fontSize: "13px" }}>
                Showing{" "}
                <strong style={{ color: "#fff" }}>
                  {pagination.total === 0 ? 0 : (page - 1) * limit + 1}
                </strong>{" "}
                to{" "}
                <strong style={{ color: "#fff" }}>
                  {Math.min(page * limit, pagination.total)}
                </strong>{" "}
                of <strong style={{ color: "#fff" }}>{pagination.total.toLocaleString()}</strong> users
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  style={paginationBtnStyle(page <= 1)}
                >
                  &laquo; First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  style={paginationBtnStyle(!pagination.hasPrevPage)}
                >
                  &lsaquo; Prev
                </button>

                <div style={{ padding: "0 10px", color: "#e5e7eb", fontSize: "13px", fontWeight: 600 }}>
                  Page {pagination.page} of {pagination.totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  style={paginationBtnStyle(!pagination.hasNextPage)}
                >
                  Next &rsaquo;
                </button>
                <button
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={page >= pagination.totalPages}
                  style={paginationBtnStyle(page >= pagination.totalPages)}
                >
                  Last &raquo;
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminSidebar>
  );
}

const metricBoxStyle: React.CSSProperties = {
  backgroundColor: "#111827",
  borderRadius: "12px",
  padding: "16px 18px",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const selectStyle: React.CSSProperties = {
  backgroundColor: "#0b0f19",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  padding: "9px 12px",
  fontSize: "12px",
  fontWeight: 500,
  outline: "none",
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  padding: "14px 18px",
  color: "#9ca3af",
  fontWeight: 600,
  fontSize: "12px",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 18px",
  verticalAlign: "middle",
};

const levelPillStyle = (color: string): React.CSSProperties => ({
  backgroundColor: "rgba(255,255,255,0.06)",
  color,
  padding: "3px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
});

const paginationBtnStyle = (disabled: boolean): React.CSSProperties => ({
  backgroundColor: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
  color: disabled ? "#4b5563" : "#e5e7eb",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
});
