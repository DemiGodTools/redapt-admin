// File: app/banners/page.tsx (Banner Spotlight Management)
"use client";

import React, { useEffect, useState, useMemo } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { useRouter } from "next/navigation";
import { uploadFileSmart } from "@/lib/clientUpload";

interface IBannerItem {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  type: "custom" | "series" | "chapter";
  redirectionType: "none" | "series" | "chapter" | "screen" | string;
  targetId?: string | null;
  targetModel?: "Series" | "Chapter" | "Screen" | string | null;
  targetScreen?: string | null;
  series?: any;
  chapter?: any;
  author?: string;
  category?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  sizeBytes?: number;
  sizeFormatted?: string;
}

interface ISeriesItem {
  _id: string;
  title: string;
  cover: string;
  author: string;
  description?: string;
  chapters?: any[];
  type?: string;
}

interface IChapterItem {
  _id: string;
  title: string;
  cover: string;
  author: string;
  type?: string;
  series?: any;
  category?: any;
}

const DEFAULT_BANNER_IMG = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80";

// Format date and time
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " • " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "N/A";
  }
};

const Icons = {
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Search: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Upload: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  Sparkles: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Book: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>,
  Layers: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  HardDrive: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>,
  ExternalLink: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
};

export default function BannerManagementPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<IBannerItem[]>([]);
  const [seriesList, setSeriesList] = useState<ISeriesItem[]>([]);
  const [chaptersList, setChaptersList] = useState<IChapterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [canEdit, setCanEdit] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [bannerSource, setBannerSource] = useState<"custom" | "series" | "chapter">("custom");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [image, setImage] = useState("");
  const [author, setAuthor] = useState("Readapt Curators");
  const [category, setCategory] = useState("Spotlight");
  
  // Redirection states for Custom mode
  const [redirectionType, setRedirectionType] = useState<"none" | "series" | "chapter" | "screen">("none");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedScreen, setSelectedScreen] = useState("");

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // RBAC Permission Check
  useEffect(() => {
    const role = localStorage.getItem("adminRole");
    const accessData = localStorage.getItem("adminAccess");
    if (!role || role === "master_admin" || role === "admin") {
      setCanEdit(true);
    } else if (accessData) {
      try {
        const access = JSON.parse(accessData);
        if (role === "team_member" && (!access.banners || access.banners === "restrict")) {
          router.replace("/admin/restricted?reason=restrict&module=banners");
          return;
        }
        if (access.banners === "edit") {
          setCanEdit(true);
        } else {
          setCanEdit(false);
        }
      } catch (e) {
        setCanEdit(false);
      }
    } else {
      if (role === "team_member") {
        router.replace("/admin/restricted?reason=restrict&module=banners");
        return;
      }
      setCanEdit(true);
    }
  }, []);

  // Fetch Banners
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/banner");
      const json = await res.json();
      if (json.success) {
        setBanners(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load banners:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Series & Chapters for selection
  const fetchAuxiliaryData = async () => {
    try {
      const [seriesRes, chaptersRes] = await Promise.all([
        fetch("/api/admin/series").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/admin/chapter").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (seriesRes?.data) setSeriesList(seriesRes.data);
      if (chaptersRes?.data) setChaptersList(chaptersRes.data);
    } catch (e) {
      console.error("Auxiliary data fetch error:", e);
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchAuxiliaryData();
  }, []);

  // Filter ONLY strictly standalone chapters (chapters not assigned or contained in any series)
  const standaloneChapters = useMemo(() => {
    // 1. Collect all chapter IDs that exist in any series' chapters list
    const seriesChapterIds = new Set<string>();
    seriesList.forEach((ser: any) => {
      if (Array.isArray(ser?.chapters)) {
        ser.chapters.forEach((chObj: any) => {
          const chId =
            chObj?.content?._id ||
            chObj?.content ||
            chObj?._id ||
            chObj;
          if (chId) {
            seriesChapterIds.add(String(chId));
          }
        });
      }
    });

    return chaptersList.filter((ch: any) => {
      if (!ch || !ch._id) return false;
      const chId = String(ch._id);

      // If chapter is part of any series' chapters array -> exclude completely
      if (seriesChapterIds.has(chId)) return false;

      // If chapter has series reference set -> exclude completely
      if (ch.series) {
        if (typeof ch.series === "object" && ch.series._id) return false;
        if (typeof ch.series === "string" && ch.series.trim().length > 0) return false;
      }
      return true;
    });
  }, [chaptersList, seriesList]);

  // Handle Banner Source Change
  const handleSourceChange = (newSource: "custom" | "series" | "chapter") => {
    setBannerSource(newSource);

    if (newSource === "custom") {
      setTitle("");
      setSubtitle("");
      setImage("");
      setAuthor("Readapt Curators");
      setCategory("Spotlight");
      setRedirectionType("none");
      setSelectedSeriesId("");
      setSelectedChapterId("");
      setSelectedScreen("");
    } else if (newSource === "series") {
      setRedirectionType("series");
      setSelectedScreen("");
      if (seriesList.length > 0) {
        applySeriesToForm(seriesList[0]);
      }
    } else if (newSource === "chapter") {
      setRedirectionType("chapter");
      setSelectedScreen("");
      if (standaloneChapters.length > 0) {
        applyChapterToForm(standaloneChapters[0]);
      }
    }
  };

  // Apply Series details to form
  const applySeriesToForm = (ser: ISeriesItem) => {
    setSelectedSeriesId(ser._id);
    setTitle(ser.title || "");
    setSubtitle(`${ser.chapters?.length || 0} Chapters • Curated Series`);
    setImage(ser.cover || "");
    setAuthor(ser.author || "Readapt Curators");
    setCategory("Series Spotlight");
  };

  // Apply Standalone Chapter details to form
  const applyChapterToForm = (ch: IChapterItem) => {
    setSelectedChapterId(ch._id);
    setTitle(ch.title || "");
    setSubtitle(`By ${ch.author || "Readapt Curators"}`);
    setImage(ch.cover || "");
    setAuthor(ch.author || "Readapt Curators");
    setCategory(ch.category?.name || "Featured Book");
  };

  // Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setUploadProgress(0);
    try {
      const url = await uploadFileSmart(file, "banners", (pct) => setUploadProgress(pct));
      setImage(url);
    } catch (err: any) {
      alert(err?.message || "Error uploading banner image");
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  // Reset Modal Form
  const resetForm = () => {
    setBannerSource("custom");
    setTitle("");
    setSubtitle("");
    setImage("");
    setAuthor("Readapt Curators");
    setCategory("Spotlight");
    setRedirectionType("none");
    setSelectedSeriesId("");
    setSelectedChapterId("");
    setSelectedScreen("");
    setUploadingImage(false);
    setUploadProgress(null);
    setShowModal(false);
  };

  // Submit New Banner
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert("Banner title is required");
    if (!image.trim()) return alert("Banner 3:4 image is required");

    let finalTargetId: string | null = null;
    let finalTargetModel: string | null = null;
    let finalTargetScreen: string | null = null;

    if (bannerSource === "series" || (bannerSource === "custom" && redirectionType === "series")) {
      finalTargetId = selectedSeriesId || null;
      finalTargetModel = "Series";
    } else if (bannerSource === "chapter" || (bannerSource === "custom" && redirectionType === "chapter")) {
      finalTargetId = selectedChapterId || null;
      finalTargetModel = "Chapter";
    } else if (bannerSource === "custom" && redirectionType === "screen") {
      if (!selectedScreen) {
        return alert("Please select a target app page / screen");
      }
      finalTargetId = selectedScreen;
      finalTargetModel = "Screen";
      finalTargetScreen = selectedScreen;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: image.trim(),
        type: bannerSource,
        redirectionType: bannerSource === "custom" ? redirectionType : bannerSource,
        targetId: finalTargetId,
        targetModel: finalTargetModel,
        targetScreen: finalTargetScreen,
        author: author.trim(),
        category: category.trim(),
      };

      const res = await fetch("/api/admin/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        resetForm();
        fetchBanners();
      } else {
        alert(data.message || "Failed to create banner");
      }
    } catch (err) {
      alert("Error saving banner");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Banner (Only action button per instructions)
  const handleDelete = async (bannerId: string, bannerTitle: string) => {
    if (!confirm(`Are you sure you want to delete banner "${bannerTitle}"?`)) return;

    try {
      const res = await fetch(`/api/admin/banner?id=${bannerId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchBanners();
      } else {
        alert(data.message || "Failed to delete banner");
      }
    } catch (err) {
      alert("Error deleting banner");
    }
  };

  // Filter banners based on search and sort
  const filteredBanners = useMemo(() => {
    let result = banners;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((b) =>
        b.title.toLowerCase().includes(term) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(term)) ||
        (b.author && b.author.toLowerCase().includes(term)) ||
        (b.category && b.category.toLowerCase().includes(term))
      );
    }
    return [...result].sort((a, b) => {
      if (sortBy === "a-z") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "z-a") return (b.title || "").localeCompare(a.title || "");
      if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === "size-desc") return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      if (sortBy === "size-asc") return (a.sizeBytes || 0) - (b.sizeBytes || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [banners, searchTerm, sortBy]);

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
                  Banner Spotlight Hub
                </h1>
                <span style={{ fontSize: "12px", background: "rgba(0, 210, 180, 0.15)", color: "#00D2B4", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
                  {banners.length} Active Banners
                </span>
              </div>
              <p style={{ color: "#9ca3af", margin: 0, fontSize: "14px" }}>
                Manage high-impact 3:4 promotional banners displayed on the mobile app home screen.
              </p>
            </div>

            {canEdit && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                style={{
                  backgroundColor: "#00D2B4",
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 14px rgba(0, 210, 180, 0.3)",
                }}
              >
                <Icons.Plus /> Create Banner
              </button>
            )}
          </div>

          {/* Search & Sort Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ position: "relative", minWidth: "280px", flex: 1, maxWidth: "460px" }}>
              <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none", display: "flex" }}>
                <Icons.Search />
              </div>
              <input
                type="text"
                placeholder="Search banners by title, author, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 16px 11px 40px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "#111827",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "#111827",
                  color: "#e5e7eb",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="newest" style={{ background: "#111827" }}>Sort: Newest First</option>
                <option value="oldest" style={{ background: "#111827" }}>Sort: Oldest First</option>
                <option value="a-z" style={{ background: "#111827" }}>Sort: Title A-Z</option>
                <option value="z-a" style={{ background: "#111827" }}>Sort: Title Z-A</option>
                <option value="size-desc" style={{ background: "#111827" }}>Sort: Size (Largest)</option>
                <option value="size-asc" style={{ background: "#111827" }}>Sort: Size (Smallest)</option>
              </select>
            </div>
          </div>

          {/* Banners Grid with 3:4 Aspect Ratio Cards */}
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>Loading spotlight banners...</div>
          ) : filteredBanners.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "#111827", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ color: "#9ca3af", margin: 0 }}>No spotlight banners found.</p>
              {canEdit && (
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    marginTop: "14px",
                    background: "none",
                    border: "none",
                    color: "#00D2B4",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  + Create your first banner
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "22px" }}>
              {filteredBanners.map((b) => {
                const isCustom = b.type === "custom";
                const isSeries = b.type === "series";
                const isChapter = b.type === "chapter";

                let targetTitle = "None (Static)";
                if (b.redirectionType === "series") {
                  targetTitle = b.series?.title || (b.targetId ? `Series #${b.targetId.slice(-6)}` : "Series");
                } else if (b.redirectionType === "chapter") {
                  targetTitle = b.chapter?.title || (b.targetId ? `Book #${b.targetId.slice(-6)}` : "Book");
                } else if (
                  b.redirectionType === "screen" ||
                  b.redirectionType === "page" ||
                  b.targetModel === "Screen" ||
                  b.targetScreen ||
                  ["downloads", "trending", "subscription", "upgrade", "profile", "liked", "recent_reads"].includes(b.redirectionType)
                ) {
                  const scr = (b.targetScreen || b.targetId || b.redirectionType || "").toLowerCase();
                  const screenLabels: Record<string, string> = {
                    downloads: "📥 Downloads Tab",
                    trending: "🔥 Trending Page",
                    subscription: "💎 Upgrade / Subscription",
                    upgrade: "💎 Upgrade / Subscription",
                    profile: "👤 User Profile & Streaks",
                    liked: "❤️ Liked Content",
                    recent_reads: "⏱️ Recent Reads",
                  };
                  targetTitle = screenLabels[scr] || `Screen: ${scr}`;
                }

                return (
                  <div
                    key={b._id}
                    style={{
                      backgroundColor: "#161d2d",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                      position: "relative",
                      transition: "transform 0.2s, border-color 0.2s",
                    }}
                  >
                    {/* 3:4 Aspect Ratio Image Container */}
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "3 / 4",
                        overflow: "hidden",
                        position: "relative",
                        backgroundColor: "#0b0f19",
                      }}
                    >
                      <img
                        src={b.image || DEFAULT_BANNER_IMG}
                        alt={b.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_BANNER_IMG;
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />

                      {/* Top Badges */}
                      <div style={{ position: "absolute", top: "10px", left: "10px", right: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span
                            style={{
                              background: "rgba(0,0,0,0.7)",
                              backdropFilter: "blur(6px)",
                              color: "#fff",
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "4px 8px",
                              borderRadius: "12px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              border: "1px solid rgba(255,255,255,0.15)",
                            }}
                          >
                            {b.category || "Spotlight"}
                          </span>
                          {b.sizeFormatted && (
                            <span
                              title={`Banner Image Size: ${b.sizeFormatted}`}
                              style={{
                                background: "rgba(0, 210, 180, 0.95)",
                                color: "#000",
                                fontSize: "10px",
                                fontWeight: 800,
                                padding: "4px 8px",
                                borderRadius: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
                              }}
                            >
                              <Icons.HardDrive /> {b.sizeFormatted}
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            background: isCustom
                              ? "rgba(245, 158, 11, 0.85)"
                              : isSeries
                              ? "rgba(1, 121, 111, 0.85)"
                              : "rgba(56, 189, 248, 0.85)",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {isCustom && <Icons.Sparkles />}
                          {isSeries && <Icons.Layers />}
                          {isChapter && <Icons.Book />}
                          {isCustom ? "Custom" : isSeries ? "Series" : "Book"}
                        </span>
                      </div>

                      {/* 3:4 Ratio Tag */}
                      <span
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          right: "8px",
                          background: "rgba(0,0,0,0.65)",
                          backdropFilter: "blur(4px)",
                          color: "#9ca3af",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        3:4 Ratio
                      </span>
                    </div>

                    {/* Card Content Area */}
                    <div style={{ padding: "14px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", gap: "12px" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#fff", lineHeight: "1.3" }}>
                          {b.title}
                        </h3>

                        {b.subtitle ? (
                          <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#9ca3af", lineHeight: "1.4" }}>
                            {b.subtitle}
                          </p>
                        ) : null}

                        <p style={{ margin: "0 0 10px", fontSize: "11px", color: "#6b7280" }}>
                          By {b.author || "Readapt Curators"}
                        </p>

                        {/* Redirection Target Tag */}
                        <div style={{ padding: "8px 10px", backgroundColor: "#0e1320", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "#00D2B4", display: "flex" }}><Icons.ExternalLink /></span>
                          <span style={{ fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            Target: <strong style={{ color: "#fff" }}>{targetTitle}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Footer: Date and ONLY Delete Button */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                          🕒 {formatDateTime(b.createdAt)}
                        </div>

                        {canEdit && (
                          <button
                            onClick={() => handleDelete(b._id, b.title)}
                            style={{
                              backgroundColor: "rgba(239, 68, 68, 0.12)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              transition: "all 0.2s",
                            }}
                            title="Delete this Banner"
                          >
                            <Icons.Trash /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal: Create Banner */}
          {showModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "20px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#161d2d",
                  borderRadius: "14px",
                  padding: "24px",
                  width: "100%",
                  maxWidth: "600px",
                  maxHeight: "92vh",
                  overflowY: "auto",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <h2 style={{ fontSize: "19px", fontWeight: 700, margin: 0, color: "#fff" }}>
                    Create Spotlight Banner
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "18px" }}
                  >
                    ✕
                  </button>
                </div>

                {/* Source Selection Tabs */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#9ca3af", marginBottom: "8px", textTransform: "uppercase" }}>
                    Select Banner Type
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleSourceChange("custom")}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: bannerSource === "custom" ? "1px solid #00D2B4" : "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: bannerSource === "custom" ? "rgba(0, 210, 180, 0.15)" : "#0b0f19",
                        color: bannerSource === "custom" ? "#00D2B4" : "#9ca3af",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      ✨ Custom Banner
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSourceChange("series")}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: bannerSource === "series" ? "1px solid #00D2B4" : "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: bannerSource === "series" ? "rgba(0, 210, 180, 0.15)" : "#0b0f19",
                        color: bannerSource === "series" ? "#00D2B4" : "#9ca3af",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      📚 From Series
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSourceChange("chapter")}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: bannerSource === "chapter" ? "1px solid #00D2B4" : "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: bannerSource === "chapter" ? "rgba(0, 210, 180, 0.15)" : "#0b0f19",
                        color: bannerSource === "chapter" ? "#00D2B4" : "#9ca3af",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      📖 Standalone Book
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  
                  {/* Dynamic Dropdowns for Series or Chapter selection */}
                  {bannerSource === "series" && (
                    <div style={{ backgroundColor: "#0e1320", padding: "14px", borderRadius: "10px", border: "1px solid rgba(0, 210, 180, 0.3)" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#00D2B4", marginBottom: "6px" }}>
                        Select Curated Series *
                      </label>
                      <select
                        value={selectedSeriesId}
                        onChange={(e) => {
                          const ser = seriesList.find((s) => s._id === e.target.value);
                          if (ser) applySeriesToForm(ser);
                        }}
                        style={inputStyle}
                        required
                      >
                        <option value="">-- Choose Series --</option>
                        {seriesList.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.title} ({s.chapters?.length || 0} Chapters) - by {s.author}
                          </option>
                        ))}
                      </select>
                      <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#6b7280" }}>
                        Cover, title, and author will be automatically pulled from the chosen series.
                      </p>
                    </div>
                  )}

                  {bannerSource === "chapter" && (
                    <div style={{ backgroundColor: "#0e1320", padding: "14px", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#38bdf8", marginBottom: "6px" }}>
                        Select Standalone Book (Non-Series Chapters Only) *
                      </label>
                      <select
                        value={selectedChapterId}
                        onChange={(e) => {
                          const ch = standaloneChapters.find((c) => c._id === e.target.value);
                          if (ch) applyChapterToForm(ch);
                        }}
                        style={inputStyle}
                        required
                      >
                        <option value="">-- Choose Standalone Book --</option>
                        {standaloneChapters.map((ch) => (
                          <option key={ch._id} value={ch._id}>
                            {ch.title} - by {ch.author} [{ch.type?.toUpperCase()}]
                          </option>
                        ))}
                      </select>
                      <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#6b7280" }}>
                        Only standalone chapters (not inside any series) are available here.
                      </p>
                    </div>
                  )}

                  {/* Title & Subtitle */}
                  <div>
                    <label style={labelStyle}>Banner Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Master the Mind, Discover Ancient Stoicism"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Subtitle / Tagline (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. A curated deep-dive into cognitive psychology"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={labelStyle}>Author / Curator</label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Top Badge Category</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* 3:4 Cover Art Upload & Input */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={labelStyle}>Cover Image (3:4 Ratio Required) *</label>
                      <span style={{ fontSize: "11px", color: "#00D2B4", fontWeight: 700 }}>
                        3:4 Ratio Format
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        required
                        placeholder="https://... or click Upload"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <label
                        style={{
                          border: "1px solid rgba(0, 210, 180, 0.35)",
                          backgroundColor: uploadingImage ? "rgba(255,255,255,0.1)" : "rgba(0, 210, 180, 0.15)",
                          color: uploadingImage ? "#9ca3af" : "#00D2B4",
                          padding: "9px 15px",
                          borderRadius: "8px",
                          cursor: uploadingImage ? "not-allowed" : "pointer",
                          fontSize: "12px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Icons.Upload />
                        {uploadingImage
                          ? (uploadProgress !== null ? `Uploading ${uploadProgress}%` : "Uploading...")
                          : "Upload 3:4"}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImage}
                          onChange={handleFileUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>

                    {/* Live 3:4 Modal Preview Box */}
                    {image.trim() ? (
                      <div style={{ marginTop: "12px", display: "flex", gap: "14px", alignItems: "center", backgroundColor: "#0b0f19", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ width: "90px", aspectRatio: "3 / 4", borderRadius: "6px", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.15)" }}>
                          <img
                            src={image}
                            alt="3:4 Preview"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_BANNER_IMG; }}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginBottom: "2px" }}>
                            {title || "Banner Title Preview"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>
                            {subtitle || "Subtitle preview will appear here"}
                          </div>
                          <span style={{ fontSize: "10px", color: "#00D2B4", background: "rgba(0, 210, 180, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                            3:4 Portrait Ratio Confirmed
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Redirection Options for Custom Banners */}
                  {bannerSource === "custom" && (
                    <div style={{ backgroundColor: "#0e1320", padding: "14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", marginTop: "4px" }}>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#9ca3af", marginBottom: "6px" }}>
                        On-Click Redirection (Optional)
                      </label>
                      <select
                        value={redirectionType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setRedirectionType(val);
                          if (val === "none") {
                            setSelectedSeriesId("");
                            setSelectedChapterId("");
                            setSelectedScreen("");
                          }
                        }}
                        style={inputStyle}
                      >
                        <option value="none">No Redirection (Announcement / Static Display)</option>
                        <option value="screen">📱 Redirect to App Screen / Page (Downloads, Trending, Upgrade, Profile, etc.)</option>
                        <option value="series">📚 Redirect to a Curated Series</option>
                        <option value="chapter">📖 Redirect to a Standalone Book / Chapter</option>
                      </select>

                      {redirectionType === "screen" && (
                        <div style={{ marginTop: "10px" }}>
                          <label style={{ display: "block", fontSize: "11px", color: "#a855f7", marginBottom: "4px", fontWeight: 600 }}>
                            Choose Target App Screen / Page: *
                          </label>
                          <select
                            value={selectedScreen}
                            onChange={(e) => {
                              const s = e.target.value;
                              setSelectedScreen(s);
                              if (category === "Spotlight" || !category) {
                                if (s === "downloads") setCategory("Downloads");
                                else if (s === "trending") setCategory("Trending");
                                else if (s === "subscription") setCategory("Premium");
                                else if (s === "profile") setCategory("Profile");
                                else if (s === "liked") setCategory("Favorites");
                                else if (s === "recent_reads") setCategory("History");
                              }
                            }}
                            style={inputStyle}
                            required
                          >
                            <option value="">-- Choose App Screen --</option>
                            <option value="downloads">📥 Downloads Page (Offline Library & Saved Chapters)</option>
                            <option value="trending">🔥 Trending Page (Top Trending Reads & Audio)</option>
                            <option value="subscription">💎 Upgrade / Subscription Page (Plans & Pricing)</option>
                            <option value="profile">👤 User Profile (Streaks, Badges & Settings)</option>
                            <option value="liked">❤️ Liked Content (User Favorites)</option>
                            <option value="recent_reads">⏱️ Recent Reads (Reading History)</option>
                          </select>
                        </div>
                      )}

                      {redirectionType === "series" && (
                        <div style={{ marginTop: "10px" }}>
                          <label style={{ display: "block", fontSize: "11px", color: "#00D2B4", marginBottom: "4px", fontWeight: 600 }}>
                            Choose Target Series:
                          </label>
                          <select
                            value={selectedSeriesId}
                            onChange={(e) => setSelectedSeriesId(e.target.value)}
                            style={inputStyle}
                            required
                          >
                            <option value="">-- Choose Series --</option>
                            {seriesList.map((s) => (
                              <option key={s._id} value={s._id}>{s.title}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {redirectionType === "chapter" && (
                        <div style={{ marginTop: "10px" }}>
                          <label style={{ display: "block", fontSize: "11px", color: "#38bdf8", marginBottom: "4px", fontWeight: 600 }}>
                            Choose Target Standalone Book:
                          </label>
                          <select
                            value={selectedChapterId}
                            onChange={(e) => setSelectedChapterId(e.target.value)}
                            style={inputStyle}
                            required
                          >
                            <option value="">-- Choose Standalone Book ({standaloneChapters.length} available) --</option>
                            {standaloneChapters.map((ch) => (
                              <option key={ch._id} value={ch._id}>{ch.title} - by {ch.author} [{ch.type?.toUpperCase() || "PDF"}]</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                    <button
                      type="button"
                      onClick={resetForm}
                      style={{
                        padding: "10px 18px",
                        backgroundColor: "transparent",
                        color: "#9ca3af",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploadingImage}
                      style={{
                        padding: "10px 22px",
                        backgroundColor: "#00D2B4",
                        color: "#000",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: (submitting || uploadingImage) ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        opacity: (submitting || uploadingImage) ? 0.7 : 1,
                      }}
                    >
                      {submitting ? "Publishing..." : "Publish Banner"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminSidebar>
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
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#9ca3af",
  marginBottom: "6px",
};

