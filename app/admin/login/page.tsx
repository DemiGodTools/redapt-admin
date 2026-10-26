"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Clean SVG Icons
const Icons = {
  Mail: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  Lock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Key: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  EyeOff: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
};

export default function AdminLoginPage() {
  const router = useRouter();
  
  const [loginType, setLoginType] = useState<"admin" | "team">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !password || (loginType === "admin" && !secret)) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = loginType === "admin" ? "/api/admin/auth/login" : "/api/admin/auth/team-login";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginType === "admin" ? { email, password, secret } : { email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Welcome ${data.name || 'back'}! Redirecting...`);
        localStorage.setItem("adminRole", data.role || "master_admin");
        localStorage.setItem("adminName", data.name || "Admin");
        localStorage.setItem("adminEmail", email);
        
        // ⚡ Yahan user ki access permissions ko save kiya hai
        if(data.access) {
             localStorage.setItem("adminAccess", JSON.stringify(data.access));
        }

        setTimeout(() => router.push("/chapters"), 1500);
      } else {
        setError(data.message || "Invalid credentials.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b0f19", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "sans-serif" }}>
      
      {successMsg && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#10b981", color: "#fff", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, boxShadow: "0 10px 25px rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", gap: "10px" }}>
          {successMsg}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: "420px", backgroundColor: "#111827", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", padding: "40px 32px", boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }}>
        
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "80px", height: "80px", borderRadius: "20px", backgroundColor: "#161f33", marginBottom: "16px", overflow: "hidden" }}>
            <Image src="/splash-icon.png" alt="Readapt Logo" width={64} height={64} style={{ objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            {loginType === "admin" ? "Admin Login" : "Team Access Login"}
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>
            {loginType === "admin" ? "Enter your admin credentials." : "Enter your team access credentials."}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, marginBottom: "20px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div>
            <label style={labelStyle}>Email Address</label>
            <div style={inputWrapperStyle}>
              <div style={iconLeftStyle}><Icons.Mail /></div>
              <input type="email" required placeholder="name@readapt.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={inputWrapperStyle}>
              <div style={iconLeftStyle}><Icons.Lock /></div>
              <input type={showPassword ? "text" : "password"} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyleWithRightIcon} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={iconRightButtonStyle}>
                {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>
          </div>

          {loginType === "admin" && (
            <div>
              <label style={labelStyle}>Master Secret Key</label>
              <div style={inputWrapperStyle}>
                <div style={iconLeftStyle}><Icons.Key /></div>
                <input type={showSecret ? "text" : "password"} required placeholder="Secure access token" value={secret} onChange={(e) => setSecret(e.target.value)} style={inputStyleWithRightIcon} />
                <button type="button" onClick={() => setShowSecret(!showSecret)} style={iconRightButtonStyle}>
                  {showSecret ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ marginTop: "12px", width: "100%", padding: "14px", backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Authenticating..." : "Secure Login"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <button 
            type="button" 
            onClick={() => setLoginType(loginType === "admin" ? "team" : "admin")}
            style={{ background: "transparent", border: "none", color: "#9ca3af", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
          >
            {loginType === "admin" ? "Login as a Team Member" : "Login as Admin"}
          </button>
        </div>

      </div>
    </div>
  );
}

// Inline Styles 
const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" };
const inputWrapperStyle: React.CSSProperties = { position: "relative", display: "flex", alignItems: "center" };
const iconLeftStyle: React.CSSProperties = { position: "absolute", left: "14px", color: "#6b7280", display: "flex", pointerEvents: "none" };
const iconRightButtonStyle: React.CSSProperties = { position: "absolute", right: "14px", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", padding: "4px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px 12px 42px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(0,0,0,0.2)", color: "#fff", outline: "none", fontSize: "14px", boxSizing: "border-box", transition: "border-color 0.2s" };
const inputStyleWithRightIcon: React.CSSProperties = { ...inputStyle, paddingRight: "42px" };