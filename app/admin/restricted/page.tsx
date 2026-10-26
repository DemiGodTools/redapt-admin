"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function RestrictedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const moduleName = searchParams.get("module") || "this";

  const message = reason === "viewonly"
    ? `You only have VIEW access for ${moduleName}. You cannot create, edit, or manage items here.`
    : `You do not have permission to access the ${moduleName} module.`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '80vh', backgroundColor: '#050811' }}>
      <div style={{ textAlign: 'center', backgroundColor: '#111827', padding: '40px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', maxWidth: '400px' }}>
        <div style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h2 style={{ color: '#fff', fontSize: '22px', marginBottom: '8px' }}>Access Denied</h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.5' }}>{message}</p>
      </div>
    </div>
  );
}

export default function RestrictedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RestrictedContent />
    </Suspense>
  );
}