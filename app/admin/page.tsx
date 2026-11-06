"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

// Clean Professional SVG Icons (Zero Emojis)
const Icons = {
  Activity: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Book: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  Layers: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  Help: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Banner: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  Team: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  UserX: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>,
  ArrowRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  Refresh: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
  Search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Clock: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  ChevronRight: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  HardDrive: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
      <line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
  ),
  Music: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  FileText: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Image: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
};

export default function AdminDashboard() {
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("master_admin");
  const [userAccess, setUserAccess] = useState<any>(null);

  // Form State for Thoughts
  const [thoughtTitle, setThoughtTitle] = useState("");
  const [thoughtDesc, setThoughtDesc] = useState("");
  const [currentThought, setCurrentThought] = useState<{ title: string; desc: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Real Database Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalActiveUsers: 0,
    loggedInUsers: 0,
    loggedOutUsers: 0,
    totalPendingDeletions: 0,
    recentUsers: 0,
    totalChapters: 0,
    totalSeries: 0,
    frameworkSeriesCount: 0,
    normalSeriesCount: 0,
    totalQuestions: 0,
    totalBanners: 0,
    activeBanners: 0,
    totalTeamMembers: 0,
    totalAdmins: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Backblaze B2 Storage Stats State
  const [storageStats, setStorageStats] = useState<any>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [showStorageFiles, setShowStorageFiles] = useState(false);
  const [backblazeTab, setBackblazeTab] = useState<"storage" | "bandwidth">("storage");
  const [storageItemFilter, setStorageItemFilter] = useState("");

  // Recent Activities State
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activityCategory, setActivityCategory] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");
  const [debouncedActivitySearch, setDebouncedActivitySearch] = useState("");
  const [activityStartDate, setActivityStartDate] = useState("");
  const [activityEndDate, setActivityEndDate] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [totalActivities, setTotalActivities] = useState(0);

  // Search debounce for activities
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedActivitySearch(activitySearch);
      setActivityPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [activitySearch]);

  const fetchLiveStats = async () => {
    try {
      const res = await fetch("/api/admin/dashboard/stats");
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setStats(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchStorageStats = async () => {
    try {
      setLoadingStorage(true);
      const res = await fetch("/api/admin/storage/stats");
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setStorageStats(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch storage stats:", e);
    } finally {
      setLoadingStorage(false);
    }
  };

  const fetchLiveThought = async () => {
    try {
      const res = await fetch("/api/admin/thought/update");
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setCurrentThought({ title: data.data.title, desc: data.data.desc });
        setThoughtTitle(data.data.title || "");
        setThoughtDesc(data.data.desc || "");
      }
    } catch (e) {
      console.error("Failed to fetch current thought:", e);
    }
  };

  const fetchActivities = useCallback(async (pageToLoad = 1, append = false) => {
    setLoadingActivities(true);
    try {
      const params = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: "20",
        category: activityCategory,
      });
      if (debouncedActivitySearch) params.set("search", debouncedActivitySearch);
      if (activityStartDate) params.set("startDate", activityStartDate);
      if (activityEndDate) params.set("endDate", activityEndDate);

      const res = await fetch(`/api/admin/activities?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        if (append) {
          setActivities((prev) => [...prev, ...json.data]);
        } else {
          setActivities(json.data);
        }
        setHasMoreActivities(Boolean(json.pagination?.hasMore));
        setTotalActivities(json.pagination?.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch activities:", e);
    } finally {
      setLoadingActivities(false);
    }
  }, [activityCategory, debouncedActivitySearch, activityStartDate, activityEndDate]);

  useEffect(() => {
    const role = localStorage.getItem("adminRole");
    const accessData = localStorage.getItem("adminAccess");
    setUserRole(role || "master_admin");
    setUserName(localStorage.getItem("adminName") || "Admin");

    if (role === "master_admin") {
      setCanEdit(true);
    } else if (accessData) {
      try {
        const access = JSON.parse(accessData);
        setUserAccess(access);
        if (role === "team_member" && (!access.dashboard || access.dashboard === "restrict")) {
          router.replace("/admin/restricted?reason=restrict&module=dashboard");
          return;
        }
        if (access.dashboard === "edit") {
          setCanEdit(true);
        }
      } catch (e) {
        console.error("Failed to parse access data");
      }
    } else if (role === "team_member") {
      router.replace("/admin/restricted?reason=restrict&module=dashboard");
      return;
    }

    fetchLiveThought();
    fetchLiveStats();
    fetchStorageStats();
  }, [router]);

  const canAccessModule = (key: string) => {
    if (userRole === "master_admin" || userRole === "admin") return true;
    if (!userAccess) return false;
    const lvl = userAccess[key];
    return lvl === "view" || lvl === "edit";
  };

  useEffect(() => {
    fetchActivities(activityPage, activityPage > 1);
  }, [fetchActivities, activityPage]);

  const handlePostThought = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return alert("You do not have permission to post thoughts.");
    if (!thoughtTitle.trim() || !thoughtDesc.trim()) return alert("Please fill all fields.");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/thought/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: thoughtTitle.trim(), desc: thoughtDesc.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Thought posted successfully!");
        if (data.data) {
          setCurrentThought({ title: data.data.title, desc: data.data.desc });
          setThoughtTitle(data.data.title);
          setThoughtDesc(data.data.desc);
        }
        fetchActivities(1, false);
      } else {
        alert(data.message || "Failed to post thought.");
      }
    } catch (err) {
      alert("An error occurred while posting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatActivityDate = (isoString?: string) => {
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

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "CHAPTER_ADDED":
        return { icon: <Icons.Book />, color: "#00D2B4", bg: "rgba(0, 210, 180, 0.12)" };
      case "SERIES_ADDED":
        return { icon: <Icons.Layers />, color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" };
      case "BANNER_ADDED":
        return { icon: <Icons.Banner />, color: "#c084fc", bg: "rgba(192, 132, 252, 0.12)" };
      case "QUESTION_ADDED":
        return { icon: <Icons.Help />, color: "#f472b6", bg: "rgba(244, 114, 182, 0.12)" };
      case "DELETION_REQUESTED":
        return { icon: <Icons.UserX />, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" };
      case "DELETION_CANCELLED":
        return { icon: <Icons.Activity />, color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" };
      case "DELETION_PURGED":
        return { icon: <Icons.UserX />, color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" };
      default:
        return { icon: <Icons.Users />, color: "#9ca3af", bg: "rgba(255, 255, 255, 0.08)" };
    }
  };

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
                Welcome back, <span style={{ color: "#00D2B4" }} suppressHydrationWarning>{userName}</span>
              </h1>
              <p style={{ color: "#9ca3af", margin: "8px 0 0", fontSize: "14px" }}>
                Live overview of Readapt catalog, users directory, and activity audit streams.
              </p>
            </div>

            <button
              onClick={() => {
                setLoadingStats(true);
                fetchLiveStats();
                fetchLiveThought();
                fetchStorageStats();
                fetchActivities(1, false);
              }}
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
              <Icons.Refresh /> {loadingStats ? "Refreshing..." : "Refresh Dashboard"}
            </button>
          </div>

          {/* Metric Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "32px" }}>
            
            {/* 1. Total Registered Users (Clickable -> /admin/users) */}
            <StatCard
              title="Total Registered Users"
              value={loadingStats ? "..." : stats.totalUsers.toLocaleString()}
              subtitle={`+${stats.recentUsers} joined past 7d`}
              icon={<Icons.Users />}
              color="blue"
              actionHref="/admin/users"
              actionLabel="Directory"
            />

            {/* 2. Total Active Users (with Logged In, Logged Out, and Deletion Requests breakdown) */}
            <StatCard
              title="Total Active Users"
              value={loadingStats ? "..." : stats.totalActiveUsers.toLocaleString()}
              subtitle={`${stats.loggedInUsers} In App · ${stats.loggedOutUsers} Logged Out · ${stats.totalPendingDeletions} Deletion Req.`}
              icon={<Icons.Activity />}
              color="teal"
              actionHref="/admin/users?status=active"
              actionLabel="Active List"
            />

            {/* 3. Chapters (Books) */}
            <StatCard
              title="Existing Chapters"
              value={loadingStats ? "..." : stats.totalChapters.toLocaleString()}
              subtitle="Published book reading modules"
              icon={<Icons.Book />}
              color="teal"
              actionHref="/chapters"
              actionLabel="Chapters Hub"
            />

            {/* 4. Series with Framework & Normal Breakdown */}
            <StatCard
              title="Total Series Catalog"
              value={loadingStats ? "..." : stats.totalSeries.toLocaleString()}
              subtitle={`${stats.frameworkSeriesCount} Framework · ${stats.normalSeriesCount} Normal Series`}
              icon={<Icons.Layers />}
              color="purple"
              actionHref="/series"
              actionLabel="Series Hub"
            />

            {/* 5. Question Bank */}
            <StatCard
              title="Question Bank (Q&A)"
              value={loadingStats ? "..." : stats.totalQuestions.toLocaleString()}
              subtitle="Interactive chapter quiz bank"
              icon={<Icons.Help />}
              color="pink"
              actionHref="/questions"
              actionLabel="Q&A Bank"
            />

            {/* 6. Promotional Banners */}
            <StatCard
              title="Promotional Banners"
              value={loadingStats ? "..." : stats.totalBanners.toLocaleString()}
              subtitle={`${stats.activeBanners} Active spotlight banners`}
              icon={<Icons.Banner />}
              color="amber"
              actionHref="/banners"
              actionLabel="Banners Hub"
            />

          </div>

          {/* Account Deletion Quick Banner if any pending requests exist */}
          {stats.totalPendingDeletions > 0 && (
            <div style={{
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ color: "#f59e0b" }}><Icons.UserX /></div>
                <div>
                  <h4 style={{ margin: "0 0 2px", color: "#fff", fontSize: "14px", fontWeight: 700 }}>
                    {stats.totalPendingDeletions} Pending Account Deletion Request{stats.totalPendingDeletions > 1 ? "s" : ""}
                  </h4>
                  <p style={{ margin: 0, color: "#9ca3af", fontSize: "12px" }}>
                    Users have requested account deletion with a 48-hour recovery countdown. Review or restore from the management portal.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/deletions"
                style={{
                  backgroundColor: "#f59e0b",
                  color: "#000",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Review Requests <Icons.ArrowRight />
              </Link>
            </div>
          )}

          {/* Main Content Area: 2 Columns */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)", gap: "24px" }}>
            
            {/* Left Column - Thought Form & Administrative Shortcuts */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Daily Thought Form Widget */}
              <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#fff", fontWeight: 600 }}>Post Daily Thought</h3>
                  {currentThought && (
                    <span style={{ fontSize: "11px", color: "#00D2B4", backgroundColor: "rgba(0, 210, 180, 0.1)", padding: "3px 8px", borderRadius: "6px", fontWeight: 600 }}>
                      Live in App
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#9ca3af" }}>Publish an announcement or quote visible to all users on the feed.</p>
                
                <form onSubmit={handlePostThought} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Title or Topic (e.g., Thought of the Day)" 
                      value={thoughtTitle}
                      onChange={(e) => setThoughtTitle(e.target.value)}
                      disabled={!canEdit}
                      style={inputStyle} 
                      required
                    />
                  </div>
                  <div>
                    <textarea 
                      rows={3} 
                      placeholder="Write your thought, announcement, or quote here..." 
                      value={thoughtDesc}
                      onChange={(e) => setThoughtDesc(e.target.value)}
                      disabled={!canEdit}
                      style={inputStyle} 
                      required
                    />
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {currentThought ? (
                      <span style={{ fontSize: "12px", color: "#9ca3af", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Current: <strong style={{ color: "#e5e7eb" }}>"{currentThought.title}"</strong>
                      </span>
                    ) : <span />}
                    {!canEdit ? (
                      <span style={{ fontSize: "12px", color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "6px 12px", borderRadius: "6px", fontWeight: 600 }}>
                        View-only
                      </span>
                    ) : (
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        style={{ backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: isSubmitting ? 0.7 : 1 }}
                      >
                         <Icons.Plus /> {isSubmitting ? "Posting..." : "Push to Feed"}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Administrative Shortcuts */}
              <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff", fontWeight: 600 }}>Administrative Shortcuts</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  
                  {canAccessModule("dashboard") && (
                    <Link
                      href="/admin/users"
                      style={shortcutItemStyle}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ color: "#60a5fa" }}><Icons.Users /></div>
                        <span>User Directory</span>
                      </div>
                      <span style={badgeStyle}>{stats.totalUsers}</span>
                    </Link>
                  )}

                  {canAccessModule("chapters") && (
                    <Link
                      href="/chapters"
                      style={shortcutItemStyle}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ color: "#00D2B4" }}><Icons.Book /></div>
                        <span>Chapters</span>
                      </div>
                      <span style={badgeStyle}>{stats.totalChapters}</span>
                    </Link>
                  )}

                  {canAccessModule("series") && (
                    <Link
                      href="/series"
                      style={shortcutItemStyle}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ color: "#c084fc" }}><Icons.Layers /></div>
                        <span>Series</span>
                      </div>
                      <span style={badgeStyle}>{stats.totalSeries}</span>
                    </Link>
                  )}

                  {canAccessModule("qna") && (
                    <Link
                      href="/questions"
                      style={shortcutItemStyle}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ color: "#f472b6" }}><Icons.Help /></div>
                        <span>Q&A Bank</span>
                      </div>
                      <span style={badgeStyle}>{stats.totalQuestions}</span>
                    </Link>
                  )}

                  {canAccessModule("banners") && (
                    <Link
                      href="/banners"
                      style={shortcutItemStyle}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ color: "#fbbf24" }}><Icons.Banner /></div>
                        <span>Banners</span>
                      </div>
                      <span style={badgeStyle}>{stats.totalBanners}</span>
                    </Link>
                  )}

                  {canAccessModule("dashboard") && (
                    <Link
                      href="/admin/deletions"
                      style={shortcutItemStyle}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ color: "#ef4444" }}><Icons.UserX /></div>
                        <span>Deletions</span>
                      </div>
                      <span style={{ ...badgeStyle, color: stats.totalPendingDeletions > 0 ? "#f59e0b" : "#9ca3af" }}>
                        {stats.totalPendingDeletions}
                      </span>
                    </Link>
                  )}

                </div>
              </div>

              {/* Backblaze B2 Storage & Bandwidth Insights Widget with Two Dedicated Tabs */}
              <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Header & Two Tabs Switcher */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ color: "#00D2B4" }}><Icons.HardDrive /></div> Backblaze B2 Cloud Infrastructure
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                      Live S3 bucket insights &bull; <code style={{ color: "#00D2B4" }}>readapt-media</code>
                    </p>
                  </div>

                  {/* Dual Tab Buttons */}
                  <div style={{ display: "flex", backgroundColor: "rgba(0,0,0,0.35)", padding: "3px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <button
                      type="button"
                      onClick={() => setBackblazeTab("storage")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: backblazeTab === "storage" ? "#00D2B4" : "transparent",
                        color: backblazeTab === "storage" ? "#000" : "#9ca3af",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s"
                      }}
                    >
                      <Icons.HardDrive /> Storage (10 GB)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackblazeTab("bandwidth")}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: backblazeTab === "bandwidth" ? "#00D2B4" : "transparent",
                        color: backblazeTab === "bandwidth" ? "#000" : "#9ca3af",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s"
                      }}
                    >
                      <Icons.Activity /> Bandwidth (1 GB/day)
                    </button>
                  </div>
                </div>

                {loadingStorage ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                    Loading Backblaze quota &amp; bandwidth metrics...
                  </div>
                ) : storageStats ? (
                  <>
                    {/* ======================================================== */}
                    {/* TAB 1: STORAGE METRICS & ASSETS                          */}
                    {/* ======================================================== */}
                    {backblazeTab === "storage" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        
                        {/* Storage Progress Header */}
                        <div style={{ padding: "14px", backgroundColor: "rgba(0,0,0,0.25)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
                            <span style={{ color: "#e5e7eb", fontWeight: 700 }}>
                              {storageStats.storage?.totalFormatted || storageStats.totalFormatted} Used
                            </span>
                            <span style={{ color: "#10b981", fontWeight: 600 }}>
                              {storageStats.storage?.remainingFormatted || storageStats.remainingFormatted} Free Remaining
                            </span>
                          </div>
                          
                          <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "5px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.max(2, storageStats.storage?.percentUsed || storageStats.percentUsed || 0)}%`,
                                height: "100%",
                                backgroundColor: (storageStats.storage?.percentUsed || storageStats.percentUsed || 0) > 85 ? "#ef4444" : "#00D2B4",
                                borderRadius: "5px",
                                transition: "width 0.4s",
                              }}
                            />
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>
                            <span>{storageStats.storage?.percentUsed || storageStats.percentUsed || 0}% of 10.00 GB free quota used</span>
                            <span>{storageStats.storage?.fileCount || storageStats.fileCount || 0} total media files</span>
                          </div>
                        </div>

                        {/* Breakdown Categories Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div style={storageBreakdownCardStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ef4444", fontSize: "12px", fontWeight: 600 }}>
                              <Icons.FileText /> <span>Book PDFs</span>
                            </div>
                            <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px", marginTop: "3px" }}>
                              {storageStats.breakdown?.pdf?.formatted || "0 B"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>{storageStats.breakdown?.pdf?.count || 0} documents</div>
                          </div>

                          <div style={storageBreakdownCardStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#fbbf24", fontSize: "12px", fontWeight: 600 }}>
                              <Icons.Image /> <span>Covers &amp; Banners</span>
                            </div>
                            <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px", marginTop: "3px" }}>
                              {storageStats.breakdown?.image?.formatted || "0 B"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>{storageStats.breakdown?.image?.count || 0} graphics</div>
                          </div>

                          <div style={storageBreakdownCardStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#60a5fa", fontSize: "12px", fontWeight: 600 }}>
                              <Icons.Music /> <span>Audiobooks</span>
                            </div>
                            <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px", marginTop: "3px" }}>
                              {storageStats.breakdown?.audio?.formatted || "0 B"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>{storageStats.breakdown?.audio?.count || 0} audio tracks</div>
                          </div>

                          <div style={storageBreakdownCardStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9ca3af", fontSize: "12px", fontWeight: 600 }}>
                              <Icons.HardDrive /> <span>Other Files</span>
                            </div>
                            <div style={{ color: "#fff", fontWeight: 800, fontSize: "15px", marginTop: "3px" }}>
                              {storageStats.breakdown?.other?.formatted || "0 B"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280" }}>{storageStats.breakdown?.other?.count || 0} assets</div>
                          </div>
                        </div>

                        {/* Stored Media Items List */}
                        <div style={{ marginTop: "4px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "12px", color: "#d1d5db", fontWeight: 600 }}>
                              Stored Content Items ({storageStats.recentFiles?.length || 0})
                            </span>
                            <button
                              onClick={() => setShowStorageFiles(!showStorageFiles)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#00D2B4",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {showStorageFiles ? "Collapse ▲" : "Expand All ▼"}
                            </button>
                          </div>

                          {showStorageFiles && (
                            <div style={{ marginBottom: "8px" }}>
                              <input
                                type="text"
                                placeholder="Filter items by title or category..."
                                value={storageItemFilter}
                                onChange={(e) => setStorageItemFilter(e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 10px",
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: "6px",
                                  color: "#fff",
                                  fontSize: "11px",
                                  outline: "none"
                                }}
                              />
                            </div>
                          )}

                          <div style={{
                            maxHeight: showStorageFiles ? "320px" : "180px",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            paddingRight: "4px"
                          }}>
                            {(storageStats.recentFiles || [])
                              .filter((file: any) => {
                                if (!storageItemFilter.trim()) return true;
                                const term = storageItemFilter.toLowerCase();
                                return (
                                  (file.displayName || "").toLowerCase().includes(term) ||
                                  (file.filename || "").toLowerCase().includes(term) ||
                                  (file.category || "").toLowerCase().includes(term)
                                );
                              })
                              .map((file: any, idx: number) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 10px",
                                    backgroundColor: "rgba(0,0,0,0.3)",
                                    border: "1px solid rgba(255,255,255,0.04)",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    gap: "8px"
                                  }}
                                >
                                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                      <span style={{
                                        fontSize: "9px",
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        padding: "1px 5px",
                                        borderRadius: "3px",
                                        backgroundColor: file.category === "pdf" ? "rgba(239,68,68,0.2)" : file.category === "audio" ? "rgba(96,165,250,0.2)" : "rgba(251,191,36,0.2)",
                                        color: file.category === "pdf" ? "#f87171" : file.category === "audio" ? "#60a5fa" : "#fbbf24",
                                      }}>
                                        {file.entityType || file.category}
                                      </span>
                                      {file.targetUrl ? (
                                        <Link href={file.targetUrl} style={{ color: "#fff", fontWeight: 600, textDecoration: "none" }}>
                                          {file.displayName || file.filename}
                                        </Link>
                                      ) : (
                                        <span style={{ color: "#fff", fontWeight: 600 }}>{file.displayName || file.filename}</span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {file.filename}
                                    </div>
                                  </div>
                                  <span style={{ color: "#00D2B4", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                                    {file.sizeFormatted}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* TAB 2: DAILY BANDWIDTH PROGRESS & EGRESS BREAKDOWN       */}
                    {/* ======================================================== */}
                    {backblazeTab === "bandwidth" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        
                        {/* Daily Bandwidth Gauge Card */}
                        <div style={{ padding: "14px", backgroundColor: "rgba(0,0,0,0.25)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", marginBottom: "8px" }}>
                            <span style={{ color: "#e5e7eb", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                              <Icons.Activity /> Today's Bandwidth: {storageStats.bandwidth?.usedFormatted || storageStats.dailyBandwidth?.usedFormatted || "0 B"}
                            </span>
                            <span style={{ color: "#00D2B4", fontWeight: 700 }}>
                              {storageStats.bandwidth?.remainingFormatted || storageStats.dailyBandwidth?.remainingFormatted || "10.00 GB"} left
                            </span>
                          </div>

                          <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "5px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.max(2, storageStats.bandwidth?.percentUsed || storageStats.dailyBandwidth?.percentUsed || 0)}%`,
                                height: "100%",
                                backgroundColor: (storageStats.bandwidth?.percentUsed || storageStats.dailyBandwidth?.percentUsed || 0) > 80 ? "#f59e0b" : "#3b82f6",
                                borderRadius: "5px",
                                transition: "width 0.4s",
                              }}
                            />
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9ca3af", marginTop: "6px", flexWrap: "wrap", gap: "4px" }}>
                            <span>{storageStats.bandwidth?.percentUsed || storageStats.dailyBandwidth?.percentUsed || 0}% of 1.00 GB/day free tier</span>
                            <span>Resets at {storageStats.bandwidth?.resetsAt || storageStats.dailyBandwidth?.resetsAt || "00:00 UTC"}</span>
                          </div>
                        </div>

                        {/* Kis Chiz Se Bandwidth Use Hua Hai (Breakdown Cards) */}
                        <div>
                          <div style={{ fontSize: "12px", color: "#d1d5db", fontWeight: 600, marginBottom: "8px" }}>
                            Bandwidth Egress Breakdown (Kis chiz se bandwidth use hua hai)
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            
                            {/* 1. Audiobooks Stream */}
                            <div style={{ padding: "12px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                                  <Icons.Music /> Audiobooks
                                </span>
                                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700 }}>56%</span>
                              </div>
                              <div style={{ color: "#fff", fontWeight: 800, fontSize: "14px" }}>
                                {storageStats.bandwidth?.breakdown?.audio?.formatted || "0 B"}
                              </div>
                              <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                                Player streams &amp; chapter listening
                              </div>
                            </div>

                            {/* 2. PDF Books */}
                            <div style={{ padding: "12px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <span style={{ color: "#f87171", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                                  <Icons.FileText /> PDF Readers
                                </span>
                                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700 }}>27%</span>
                              </div>
                              <div style={{ color: "#fff", fontWeight: 800, fontSize: "14px" }}>
                                {storageStats.bandwidth?.breakdown?.pdf?.formatted || "0 B"}
                              </div>
                              <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                                Book reader loads &amp; offline cache
                              </div>
                            </div>

                            {/* 3. Covers & Banners */}
                            <div style={{ padding: "12px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                                  <Icons.Image /> Covers &amp; Banners
                                </span>
                                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700 }}>14%</span>
                              </div>
                              <div style={{ color: "#fff", fontWeight: 800, fontSize: "14px" }}>
                                {storageStats.bandwidth?.breakdown?.image?.formatted || "0 B"}
                              </div>
                              <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                                Home carousels, cards &amp; spotlight
                              </div>
                            </div>

                            {/* 4. Avatars & Other */}
                            <div style={{ padding: "12px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <span style={{ color: "#9ca3af", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                                  <Icons.HardDrive /> Avatars &amp; API
                                </span>
                                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 700 }}>3%</span>
                              </div>
                              <div style={{ color: "#fff", fontWeight: 800, fontSize: "14px" }}>
                                {storageStats.bandwidth?.breakdown?.other?.formatted || "0 B"}
                              </div>
                              <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                                User avatars &amp; profile thumbnails
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Top Bandwidth Consuming Items */}
                        <div>
                          <div style={{ fontSize: "12px", color: "#d1d5db", fontWeight: 600, marginBottom: "8px" }}>
                            Top Content Driving Egress Today
                          </div>

                          <div style={{
                            maxHeight: "180px",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            paddingRight: "4px"
                          }}>
                            {(storageStats.bandwidth?.topConsumers || []).map((consumer: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "7px 10px",
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  border: "1px solid rgba(255,255,255,0.04)",
                                  borderRadius: "6px",
                                  fontSize: "11px"
                                }}
                              >
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                  <span style={{
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    padding: "1px 5px",
                                    borderRadius: "3px",
                                    marginRight: "6px",
                                    backgroundColor: consumer.category === "audio" ? "rgba(96,165,250,0.2)" : "rgba(239,68,68,0.2)",
                                    color: consumer.category === "audio" ? "#60a5fa" : "#f87171"
                                  }}>
                                    {consumer.category}
                                  </span>
                                  {consumer.targetUrl ? (
                                    <Link href={consumer.targetUrl} style={{ color: "#fff", fontWeight: 600, textDecoration: "none" }}>
                                      {consumer.title}
                                    </Link>
                                  ) : (
                                    <span style={{ color: "#fff", fontWeight: 600 }}>{consumer.title}</span>
                                  )}
                                  <span style={{ color: "#6b7280", marginLeft: "6px", fontSize: "10px" }}>
                                    ({consumer.estimatedHits} requests today)
                                  </span>
                                </div>
                                <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                                  ~{consumer.bandwidthUsedFormatted}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </>
                ) : null}

              </div>

            </div>

            {/* Right Column - Recent Activities Stream */}
            <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
              
              {/* Recent Activities Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", color: "#fff", fontWeight: 600 }}>Recent Activities & Audit Trail</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                    Track content additions (Books, Series, Q&A, Banners) by Admin/Members and user signups/logins.
                  </p>
                </div>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {totalActivities} total events
                </span>
              </div>

              {/* Filters & Search Toolbar */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
                
                {/* Category Filter Pills */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All Activities" },
                    { id: "content", label: "Books & Series" },
                    { id: "qna", label: "Q&A Questions" },
                    { id: "banner", label: "Banners" },
                    { id: "auth", label: "Users & Security" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setActivityCategory(cat.id); setActivityPage(1); }}
                      style={{
                        backgroundColor: activityCategory === cat.id ? "#00D2B4" : "rgba(255,255,255,0.05)",
                        color: activityCategory === cat.id ? "#000" : "#d1d5db",
                        border: "1px solid",
                        borderColor: activityCategory === cat.id ? "#00D2B4" : "rgba(255,255,255,0.1)",
                        borderRadius: "20px",
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar + Date Range */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}>
                    <div style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }}>
                      <Icons.Search />
                    </div>
                    <input
                      type="text"
                      placeholder="Search title, author, actor..."
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px 7px 32px",
                        borderRadius: "6px",
                        backgroundColor: "#0b0f19",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                        fontSize: "12px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Date Pickers */}
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input
                      type="date"
                      value={activityStartDate}
                      onChange={(e) => { setActivityStartDate(e.target.value); setActivityPage(1); }}
                      style={dateInputStyle}
                      title="From Date"
                    />
                    <span style={{ color: "#6b7280", fontSize: "11px" }}>to</span>
                    <input
                      type="date"
                      value={activityEndDate}
                      onChange={(e) => { setActivityEndDate(e.target.value); setActivityPage(1); }}
                      style={dateInputStyle}
                      title="To Date"
                    />

                    {(activitySearch || activityStartDate || activityEndDate || activityCategory !== "all") && (
                      <button
                        onClick={() => {
                          setActivitySearch("");
                          setActivityStartDate("");
                          setActivityEndDate("");
                          setActivityCategory("all");
                          setActivityPage(1);
                        }}
                        style={{
                          backgroundColor: "transparent",
                          color: "#9ca3af",
                          border: "none",
                          fontSize: "11px",
                          cursor: "pointer",
                          textDecoration: "underline",
                          marginLeft: "4px"
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Scrollable Activities Feed */}
              <div style={{
                maxHeight: "520px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                paddingRight: "6px"
              }}>
                {loadingActivities && activities.length === 0 ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                    <Icons.Refresh /> Loading activities feed...
                  </div>
                ) : activities.length === 0 ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                    No activities match your filters.
                  </div>
                ) : (
                  activities.map((act) => {
                    const iconStyle = getActivityIcon(act.action);
                    return (
                      <div
                        key={act.id}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "10px",
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          transition: "background 0.2s"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            backgroundColor: iconStyle.bg,
                            color: iconStyle.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "2px"
                          }}>
                            {iconStyle.icon}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                              <Link
                                href={act.redirectUrl || "/admin"}
                                style={{ color: "#fff", fontWeight: 600, fontSize: "13px", lineHeight: "18px", textDecoration: "none" }}
                              >
                                {act.title}
                              </Link>
                              <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Icons.Clock /> {formatActivityDate(act.createdAt)}
                              </span>
                            </div>

                            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "3px" }}>
                              {act.description}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                              {act.action === "USER_LOGIN" ? (
                                <span style={{
                                  fontSize: "11px",
                                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                                  border: "1px solid rgba(34, 197, 94, 0.3)",
                                  color: "#4ade80",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}>
                                  ● Logged In &bull; User: {act.performedBy}
                                </span>
                              ) : act.action === "USER_LOGOUT" ? (
                                <span style={{
                                  fontSize: "11px",
                                  backgroundColor: "rgba(148, 163, 184, 0.15)",
                                  border: "1px solid rgba(148, 163, 184, 0.3)",
                                  color: "#94a3b8",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}>
                                  ○ Logged Out &bull; User: {act.performedBy}
                                </span>
                              ) : act.action === "USER_SIGNUP" ? (
                                <span style={{
                                  fontSize: "11px",
                                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                                  border: "1px solid rgba(168, 85, 247, 0.3)",
                                  color: "#c084fc",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}>
                                  ★ New User Signup &bull; {act.performedBy}
                                </span>
                              ) : act.action === "DELETION_REQUESTED" ? (
                                <span style={{
                                  fontSize: "11px",
                                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  color: "#f87171",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600
                                }}>
                                  ⚠ Deletion Scheduled (48h) &bull; {act.performedBy}
                                </span>
                              ) : act.action === "DELETION_CANCELLED" ? (
                                <span style={{
                                  fontSize: "11px",
                                  backgroundColor: "rgba(6, 182, 212, 0.15)",
                                  border: "1px solid rgba(6, 182, 212, 0.3)",
                                  color: "#22d3ee",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600
                                }}>
                                  ✓ Deletion Cancelled &bull; {act.performedBy}
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: "11px",
                                  backgroundColor: "rgba(255,255,255,0.06)",
                                  color: "#d1d5db",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 500
                                }}>
                                  Added by: <strong style={{ color: "#fff" }}>
                                    {act.performedByRole === "master_admin" || act.performedBy?.toLowerCase() === "admin"
                                      ? "Admin"
                                      : act.performedBy}
                                  </strong>
                                </span>
                              )}

                              {act.performedByRole && !["USER_LOGIN", "USER_LOGOUT", "USER_SIGNUP", "DELETION_REQUESTED", "DELETION_CANCELLED"].includes(act.action) && (
                                <span style={{
                                  fontSize: "10px",
                                  textTransform: "uppercase",
                                  color: act.performedByRole === "master_admin" ? "#00D2B4" : "#9ca3af",
                                  fontWeight: 700
                                }}>
                                  {act.performedByRole.replace("_", " ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Redirection Chevron Icon Button */}
                        <Link
                          href={act.redirectUrl || "/admin"}
                          title={`Go to ${act.category || "item"}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(255,255,255,0.05)",
                            color: "#9ca3af",
                            border: "1px solid rgba(255,255,255,0.08)",
                            textDecoration: "none",
                            flexShrink: 0,
                            transition: "all 0.2s"
                          }}
                        >
                          <Icons.ChevronRight />
                        </Link>
                      </div>
                    );
                  })
                )}

                {/* Load More Button (Industry standard pagination) */}
                {hasMoreActivities && (
                  <button
                    onClick={() => setActivityPage((p) => p + 1)}
                    disabled={loadingActivities}
                    style={{
                      margin: "8px 0 4px",
                      backgroundColor: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#e5e7eb",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: loadingActivities ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    {loadingActivities ? "Loading more..." : "Load More Activities"}
                  </button>
                )}
              </div>

            </div>

          </div>

        </div>
      </div>
    </AdminSidebar>
  );
}

// -------------------------------------------------------------
// HELPER COMPONENTS & STYLES
// -------------------------------------------------------------

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  actionHref,
  actionLabel,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "amber" | "teal" | "pink";
  actionHref?: string;
  actionLabel?: string;
}) {
  const bgMap = {
    blue: "rgba(59, 130, 246, 0.1)",
    purple: "rgba(168, 85, 247, 0.1)",
    amber: "rgba(245, 158, 11, 0.1)",
    teal: "rgba(0, 210, 180, 0.1)",
    pink: "rgba(244, 114, 182, 0.1)",
  };
  const iconColorMap = {
    blue: "#60a5fa",
    purple: "#c084fc",
    amber: "#fbbf24",
    teal: "#00D2B4",
    pink: "#f472b6",
  };

  return (
    <div style={{ backgroundColor: "#111827", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: bgMap[color], color: iconColorMap[color], display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        {actionHref && (
          <Link
            href={actionHref}
            style={{ fontSize: "11px", fontWeight: 700, color: "#00D2B4", backgroundColor: "rgba(0, 210, 180, 0.1)", padding: "3px 10px", borderRadius: "6px", textDecoration: "none" }}
          >
            {actionLabel || "View"} &rarr;
          </Link>
        )}
      </div>
      <div>
        <h4 style={{ margin: "0 0 4px", fontSize: "13px", color: "#9ca3af", fontWeight: 500 }}>{title}</h4>
        <div style={{ fontSize: "24px", color: "#fff", fontWeight: 700 }}>{value}</div>
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{subtitle}</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.12)",
  backgroundColor: "#0b0f19",
  color: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "13px",
  fontFamily: "inherit"
};

const dateInputStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: "6px",
  backgroundColor: "#0b0f19",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: "11px",
  outline: "none",
  colorScheme: "dark",
};

const shortcutItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderRadius: "10px",
  backgroundColor: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "#fff",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 600,
  transition: "all 0.2s"
};

const storageBreakdownCardStyle: React.CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "8px",
  padding: "10px 12px",
};

const badgeStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#9ca3af",
  backgroundColor: "rgba(255,255,255,0.06)",
  padding: "2px 8px",
  borderRadius: "10px",
  fontWeight: 700
};
