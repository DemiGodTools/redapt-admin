"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import { getFirstAllowedRoute } from "@/lib/rbac";

function RestrictedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get("reason");
  const moduleName = searchParams.get("module") || "this";

  const [allowedRoute, setAllowedRoute] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("adminRole");
    const accessData = localStorage.getItem("adminAccess");
    let access = null;
    if (accessData) {
      try {
        access = JSON.parse(accessData);
      } catch (e) {}
    }
    const target = getFirstAllowedRoute(role, access);
    if (target && !target.includes("/admin/restricted")) {
      setAllowedRoute(target);
    }
  }, []);

  const message =
    moduleName === "all"
      ? "You do not have active permissions for any modules. Please contact your master administrator."
      : reason === "viewonly"
      ? `You only have VIEW access for ${moduleName}. You cannot create, edit, or manage items here.`
      : `You do not have permission to access the ${moduleName} module.`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "85vh",
        padding: "24px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          backgroundColor: "#111827",
          padding: "48px 36px",
          borderRadius: "16px",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          maxWidth: "460px",
          width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            color: "#ef4444",
            marginBottom: "20px",
            display: "inline-flex",
            padding: "16px",
            borderRadius: "50%",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>

        <h2 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, margin: "0 0 10px" }}>
          Access Denied
        </h2>
        <p style={{ color: "#9ca3af", fontSize: "14px", lineHeight: "1.6", margin: "0 0 28px" }}>
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          {allowedRoute ? (
            <Link
              href={allowedRoute}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                backgroundColor: "#00D2B4",
                color: "#000",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
            >
              Go to Allowed Workspace &rarr;
            </Link>
          ) : (
            <button
              onClick={() => router.back()}
              style={{
                padding: "10px 20px",
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "#e5e7eb",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              &larr; Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RestrictedPage() {
  return (
    <AdminSidebar>
      <Suspense fallback={<div style={{ padding: "40px", color: "#9ca3af" }}>Loading...</div>}>
        <RestrictedContent />
      </Suspense>
    </AdminSidebar>
  );
}
