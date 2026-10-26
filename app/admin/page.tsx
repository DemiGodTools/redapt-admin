"use client";

import React, { useState, useEffect, Suspense } from "react";
import AdminSidebar from "@/components/AdminSidebar";

// Clean SVG Icons
const Icons = {
  Activity: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  TrendingUp: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  MessageCircle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
};

export default function AdminDashboard() {
  const [canEdit, setCanEdit] = useState(false);
  const [userName, setUserName] = useState("Admin");

  // Form State for Thoughts
  const [thoughtTitle, setThoughtTitle] = useState("");
  const [thoughtDesc, setThoughtDesc] = useState("");
  const [currentThought, setCurrentThought] = useState<{ title: string; desc: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    // ⚡ RBAC Check (Dashboard access)
    const role = localStorage.getItem("adminRole");
    const accessData = localStorage.getItem("adminAccess");
    setUserName(localStorage.getItem("adminName") || "Admin");

    if (role === "master_admin") {
      setCanEdit(true);
    } else if (accessData) {
      try {
        const access = JSON.parse(accessData);
        if (access.dashboard === "edit") {
          setCanEdit(true);
        }
      } catch (e) {
        console.error("Failed to parse access data");
      }
    }

    fetchLiveThought();
  }, []);

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
      } else {
        alert(data.message || "Failed to post thought.");
      }
    } catch (err) {
      alert("An error occurred while posting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
              Welcome back, <span style={{ color: "#00D2B4" }}>{userName}</span>
            </h1>
            <p style={{ color: "#9ca3af", margin: "8px 0 0", fontSize: "14px" }}>
              Here's what's happening with Readapt today.
            </p>
          </div>

          {/* Top Stats Row (Dummy Data for Realistic Look) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "32px" }}>
            <StatCard title="Total Active Users" value="12,450" change="+14%" icon={<Icons.Users />} color="blue" />
            <StatCard title="Weekly Engagement" value="84%" change="+5%" icon={<Icons.Activity />} color="purple" />
            <StatCard title="Content Completion" value="62%" change="-2%" icon={<Icons.TrendingUp />} color="amber" isNegative />
            <StatCard title="Active Discussions" value="3,210" change="+22%" icon={<Icons.MessageCircle />} color="teal" />
          </div>

          {/* Main Grid Area */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px" }}>
            
            {/* Left Area - Quick Action / Future Data */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Daily Thought Form Widget */}
              <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#fff", fontWeight: 600 }}>Post Daily Thought</h3>
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
                      <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                        Current: <strong style={{ color: "#e5e7eb" }}>"{currentThought.title}"</strong>
                      </span>
                    ) : <span />}
                    {!canEdit ? (
                      <span style={{ fontSize: "12px", color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "6px 12px", borderRadius: "6px", fontWeight: 600 }}>
                        View-only access. Cannot post.
                      </span>
                    ) : (
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        style={{ backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "13px", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: isSubmitting ? 0.7 : 1 }}
                      >
                         <Icons.Plus /> {isSubmitting ? "Posting..." : "Push to Feed"}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Placeholder for Future Analytics Chart */}
              <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", minHeight: "280px", display: "flex", flexDirection: "column" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#fff", fontWeight: 600 }}>Audience Growth</h3>
                    <span style={{ fontSize: "11px", color: "#9ca3af", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px" }}>Last 30 Days</span>
                 </div>
                 <div style={{ flex: 1, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: "13px" }}>
                    [ Growth Chart Visualization Coming Soon ]
                 </div>
              </div>

            </div>

            {/* Right Sidebar - Recent Activity / System Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 style={{ margin: "0 0 20px", fontSize: "16px", color: "#fff", fontWeight: 600 }}>System Status</h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <StatusRow label="Database Servers" status="Operational" isGood />
                  <StatusRow label="Media CDN (Images/PDFs)" status="Operational" isGood />
                  <StatusRow label="Audio Streaming" status="Degraded" isGood={false} />
                  <StatusRow label="Payment Gateway" status="Operational" isGood />
                </div>
              </div>

              <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)", flex: 1 }}>
                 <h3 style={{ margin: "0 0 20px", fontSize: "16px", color: "#fff", fontWeight: 600 }}>Recent Activity</h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <ActivityRow text="New chapter 'Mindset Shifts' created" time="2h ago" />
                    <ActivityRow text="Series 'Startup 101' published" time="5h ago" />
                    <ActivityRow text="Team member Gulshan logged in" time="12h ago" />
                    <ActivityRow text="Payment received for Pro Tier" time="1d ago" />
                 </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </AdminSidebar>
  );
}

// -------------------------------------------------------------
// HELPER COMPONENTS
// -------------------------------------------------------------

function StatCard({ title, value, change, icon, color, isNegative }: { title: string, value: string, change: string, icon: React.ReactNode, color: "blue"|"purple"|"amber"|"teal", isNegative?: boolean }) {
  const bgMap = { blue: "rgba(59, 130, 246, 0.1)", purple: "rgba(168, 85, 247, 0.1)", amber: "rgba(245, 158, 11, 0.1)", teal: "rgba(0, 210, 180, 0.1)" };
  const iconColorMap = { blue: "#60a5fa", purple: "#c084fc", amber: "#fbbf24", teal: "#00D2B4" };
  
  return (
    <div style={{ backgroundColor: "#111827", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: bgMap[color], color: iconColorMap[color], display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <span style={{ fontSize: "12px", fontWeight: 600, color: isNegative ? "#ef4444" : "#10b981", backgroundColor: isNegative ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
          {change}
        </span>
      </div>
      <div>
        <h4 style={{ margin: "0 0 4px", fontSize: "13px", color: "#9ca3af", fontWeight: 500 }}>{title}</h4>
        <div style={{ fontSize: "24px", color: "#fff", fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function StatusRow({ label, status, isGood }: { label: string, status: string, isGood: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "13px", color: "#d1d5db" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: isGood ? "#10b981" : "#f59e0b" }} />
        <span style={{ fontSize: "12px", color: isGood ? "#10b981" : "#f59e0b", fontWeight: 600 }}>{status}</span>
      </div>
    </div>
  );
}

function ActivityRow({ text, time }: { text: string, time: string }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", marginTop: "6px", flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: "13px", color: "#d1d5db", lineHeight: "1.4" }}>{text}</div>
        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{time}</div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.12)",
  backgroundColor: "#0b0f19",
  color: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "14px",
  fontFamily: "inherit"
};
