"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// SVGs
const Icons = {
  Book: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>,
  Layers: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  Help: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Folder: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  Home: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  EyeOff: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  LogOut: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  ShieldAlert: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
};

const accessModules = ["dashboard", "categories", "series", "chapters", "qna", "banners"];

// ⚡ Global Pop-up Handler for Unauthorized Actions
function ErrorToast() {
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // 1. Monkey-patch fetch to catch 403 Access Denied from API
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      if (response.status === 403) {
        const clone = response.clone();
        try {
          const data = await clone.json();
          if (data.errorType === "RBAC") {
            window.dispatchEvent(new CustomEvent('rbac-error', { detail: data.message }));
          }
        } catch (e) {}
      }
      return response;
    };

    // 2. Listen to custom event
    const handler = (e: any) => {
      setErrorMsg(e.detail);
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    };
    
    window.addEventListener('rbac-error', handler);

    return () => {
      window.fetch = originalFetch; // restore
      window.removeEventListener('rbac-error', handler);
    };
  }, []);

  if (!showError) return null;

  return (
    <div style={{ position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#111827", border: "1px solid #ef4444", borderRadius: "12px", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px", zIndex: 9999, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
      <Icons.ShieldAlert />
      <div>
        <h4 style={{ margin: "0 0 4px", color: "#fff", fontSize: "15px", fontWeight: 700 }}>Action Not Allowed</h4>
        <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px" }}>{errorMsg}</p>
      </div>
      <button onClick={() => setShowError(false)} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", marginLeft: "12px" }}>
        <Icons.Close />
      </button>
    </div>
  );
}

export default function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState({ name: "Admin", email: "", role: "master_admin", access: null as any });

  useEffect(() => {
    const accessData = localStorage.getItem("adminAccess");
    setCurrentUser({
      name: localStorage.getItem("adminName") || "Admin",
      email: localStorage.getItem("adminEmail") || "",
      role: localStorage.getItem("adminRole") || "master_admin",
      access: accessData ? JSON.parse(accessData) : null
    });
  }, []);

  // Team Modal States
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"manage" | "add">("manage");
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    access: { dashboard: "restrict", categories: "restrict", series: "restrict", chapters: "restrict", qna: "restrict", banners: "restrict" }
  });

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: <Icons.Home />, key: "dashboard" },
    { label: "Series & Frameworks", href: "/series", icon: <Icons.Layers />, key: "series" },
    { label: "Chapters Hub", href: "/chapters", icon: <Icons.Book />, key: "chapters" },
    { label: "Question Bank", href: "/questions", icon: <Icons.Help />, key: "qna" },
    { label: "Categories", href: "/categories", icon: <Icons.Folder />, key: "categories" },
  ];

  // Filtering nav items based on user access
  const filteredNavItems = navItems.filter(item => {
    if (currentUser.role === "master_admin") return true; 
    if (!currentUser.access) return true; // Fallback
    
    // Check if the user has 'restrict' access for this module
    return currentUser.access[item.key] !== "restrict";
  });


  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      const data = await res.json();
      if (data.success) {
        setMembers(data.data.map((m: any) => ({ ...m, showPass: false })));
      }
    } catch (err) {
      console.error("Failed to fetch members", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isTeamModalOpen) fetchMembers(); }, [isTeamModalOpen]);

  const handleAccessChange = (module: string, level: string) => {
    setForm(prev => ({ ...prev, access: { ...prev.access, [module]: level } }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", email: "", password: "", access: { dashboard: "restrict", categories: "restrict", series: "restrict", chapters: "restrict", qna: "restrict", banners: "restrict" } });
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const url = editingId ? `/api/admin/team?id=${editingId}` : "/api/admin/team";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      
      if (data.success) {
        alert(editingId ? "Team member updated!" : "New member added!");
        resetForm();
        setActiveTab("manage");
        fetchMembers();
      } else {
        alert(data.message || "Failed to save member");
      }
    } catch (err) {
      alert("Network Error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      const res = await fetch(`/api/admin/team?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMembers(prev => prev.filter(m => m._id !== id));
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      alert("Error deleting member");
    }
  };

  const handleEdit = (member: any) => {
    setEditingId(member._id);
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      access: {
        dashboard: member.access?.dashboard || "restrict",
        categories: member.access?.categories || "restrict",
        series: member.access?.series || "restrict",
        chapters: member.access?.chapters || "restrict",
        qna: member.access?.qna || "restrict",
        banners: member.access?.banners || "restrict",
      }
    });
    setActiveTab("add");
  };

  const handleLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    try {
      const res = await fetch("/api/admin/auth/logout", { method: "POST" });
      if (res.ok) {
        localStorage.clear();
        router.push("/admin/login");
      }
    } catch (err) {}
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#050811", color: "#f3f4f6", position: "relative" }}>
      
      {/* GLOBAL ERROR POPUP */}
      <Suspense fallback={null}>
        <ErrorToast />
      </Suspense>

      <aside style={{ width: "260px", backgroundColor: "#0b0f19", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
        
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "22px", fontWeight: 800, color: "#00D2B4", letterSpacing: "-0.02em" }}>
            Readapt<span style={{ color: "#fff" }}>Admin</span>
          </h2>
          
          <div style={{ backgroundColor: "#111827", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "#fff" }}>{currentUser.name}</p>
            <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.email}</p>
            <span style={{ display: "inline-block", padding: "4px 8px", backgroundColor: currentUser.role === "master_admin" ? "rgba(0, 210, 180, 0.15)" : "rgba(59, 130, 246, 0.15)", color: currentUser.role === "master_admin" ? "#00D2B4" : "#3b82f6", fontSize: "10px", fontWeight: 800, borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {currentUser.role === "master_admin" ? "Admin" : "Team Member"}
            </span>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: "20px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px",
                  backgroundColor: isActive ? "rgba(0, 210, 180, 0.1)" : "transparent",
                  color: isActive ? "#00D2B4" : "#9ca3af", textDecoration: "none", fontWeight: isActive ? 700 : 500,
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ color: isActive ? "#00D2B4" : "#6b7280" }}>{item.icon}</div>
                <span style={{ fontSize: "14px" }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "20px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "8px" }}>
          {currentUser.role === "master_admin" && (
            <button 
              onClick={() => { setIsTeamModalOpen(true); setActiveTab("manage"); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.05)", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }}
            >
              <Icons.Users /> <span style={{ fontSize: "14px" }}>Manage Team</span>
            </button>
          )}
          <button 
            onClick={handleLogout}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }}
          >
            <Icons.LogOut /> <span style={{ fontSize: "14px" }}>Logout</span>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, height: "100vh", overflowY: "auto", backgroundColor: "#050811" }}>
        {children}
      </main>

      {/* TEAM MODAL */}
      {isTeamModalOpen && currentUser.role === "master_admin" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "#0b0f19", display: "flex", flexDirection: "column" }}>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#111827" }}>
            <h2 style={{ margin: 0, fontSize: "20px", color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
              <Icons.Users /> Team Access Management
            </h2>
            <button onClick={() => { setIsTeamModalOpen(false); resetForm(); }} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer" }}>
              <Icons.Close />
            </button>
          </div>

          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            
            <div style={{ width: "240px", borderRight: "1px solid rgba(255,255,255,0.08)", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#111827" }}>
              <button onClick={() => { setActiveTab("manage"); resetForm(); }} style={{ ...tabStyle, backgroundColor: activeTab === "manage" ? "rgba(0, 210, 180, 0.15)" : "transparent", color: activeTab === "manage" ? "#00D2B4" : "#9ca3af" }}>
                Manage Members
              </button>
              <button onClick={() => { setActiveTab("add"); resetForm(); }} style={{ ...tabStyle, backgroundColor: activeTab === "add" ? "rgba(0, 210, 180, 0.15)" : "transparent", color: activeTab === "add" ? "#00D2B4" : "#9ca3af" }}>
                + Add New Member
              </button>
            </div>

            <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
              
              {activeTab === "manage" && (
                <div>
                  {loading ? (
                    <p style={{ color: "#9ca3af" }}>Loading members...</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
                      {members.length === 0 ? <p style={{ color: "#9ca3af" }}>No team members added yet.</p> : null}
                      
                      {members.map(member => (
                        <div key={member._id} style={{ backgroundColor: "#161f33", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                            <div>
                              <h3 style={{ margin: "0 0 4px", color: "#fff", fontSize: "16px" }}>{member.name}</h3>
                              <p style={{ margin: 0, color: "#9ca3af", fontSize: "13px" }}>{member.email}</p>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => handleEdit(member)} style={actionBtnStyle}><Icons.Edit /></button>
                              <button onClick={() => handleDeleteMember(member._id)} style={{ ...actionBtnStyle, color: "#ef4444" }}><Icons.Trash /></button>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "6px", marginBottom: "16px" }}>
                            <span style={{ color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>PWD:</span>
                            <span style={{ color: "#fff", fontSize: "13px", letterSpacing: "2px", flex: 1 }}>
                              {"•".repeat(Math.max(member.password?.length || 0, 8))}
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {accessModules.map((mod) => {
                              const lvl = (member.access && (member.access as any)[mod]) || "restrict";
                              return (
                              <div key={mod} style={{ fontSize: "11px", display: "flex", justifyContent: "space-between", padding: "6px 8px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "4px" }}>
                                <span style={{ color: "#9ca3af", textTransform: "capitalize" }}>{mod}</span>
                                <span style={{ fontWeight: 700, color: lvl === "edit" ? "#10b981" : lvl === "view" ? "#3b82f6" : "#ef4444" }}>
                                  {String(lvl).toUpperCase()}
                                </span>
                              </div>
                              );
                            })}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "add" && (
                <form onSubmit={handleSaveMember} style={{ maxWidth: "600px", backgroundColor: "#161f33", padding: "28px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <h3 style={{ margin: "0 0 24px", color: "#fff", fontSize: "18px" }}>{editingId ? "Edit Team Member" : "Add New Team Member"}</h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Rahul Kumar" style={inputStyle} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <label style={labelStyle}>Email Address</label>
                        <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="member@readapt.com" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>{editingId ? "New Password (Optional)" : "Login Password"}</label>
                        <input required={!editingId} type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingId ? "Leave blank to keep old" : "Secure password"} style={inputStyle} />
                      </div>
                    </div>
                  </div>

                  <h4 style={{ margin: "0 0 16px", color: "#00D2B4", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Module Access Control</h4>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                    {accessModules.map((module) => (
                      <div key={module} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ color: "#fff", fontSize: "14px", textTransform: "capitalize", fontWeight: 600 }}>{module}</span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {["restrict", "view", "edit"].map((lvl) => {
                            const isSelected = (form.access as any)[module] === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => handleAccessChange(module, lvl)}
                                style={{
                                  padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", cursor: "pointer",
                                  backgroundColor: isSelected ? (lvl === "edit" ? "rgba(16, 185, 129, 0.15)" : lvl === "view" ? "rgba(59, 130, 246, 0.15)" : "rgba(239, 68, 68, 0.15)") : "transparent",
                                  color: isSelected ? (lvl === "edit" ? "#10b981" : lvl === "view" ? "#3b82f6" : "#ef4444") : "#6b7280",
                                  border: isSelected ? `1px solid ${lvl === "edit" ? "#10b981" : lvl === "view" ? "#3b82f6" : "#ef4444"}` : "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                {lvl === "edit" ? "View & Edit" : lvl}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    <button type="button" onClick={() => { setActiveTab("manage"); resetForm(); }} style={{ padding: "10px 18px", background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    <button type="submit" disabled={formLoading} style={{ padding: "10px 24px", backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: formLoading ? "not-allowed" : "pointer" }}>
                      {formLoading ? "Saving..." : editingId ? "Update Member" : "Add Member"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Styles
const tabStyle: React.CSSProperties = { width: "100%", padding: "12px", textAlign: "left", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "all 0.2s" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "6px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(0,0,0,0.2)", color: "#fff", outline: "none", fontSize: "14px", boxSizing: "border-box" };
const actionBtnStyle: React.CSSProperties = { padding: "6px", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center" };