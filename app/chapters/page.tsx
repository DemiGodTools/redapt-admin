"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface ITocItem {
  cut: string;
  title: string;
}

interface IChapterItem {
  _id: string;
  title: string;
  details: string;
  media: string;
  cover: string;
  author: string;
  type: "pdf" | "audio";
  for: number;
  isTrending: boolean;
  isDownloadable: boolean;
  category: any;
  subCategory?: any;
  series?: any;
  questions?: any[];
  toc?: ITocItem[];
  createdAt?: string;
}

interface ICategory {
  _id: string;
  name: string;
  subCategories?: { _id: string; name: string }[];
}

export default function ChaptersAdminPage() {
  const [chapters, setChapters] = useState<IChapterItem[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formDetails, setFormDetails] = useState("");
  const [formMedia, setFormMedia] = useState("");
  const [formCover, setFormCover] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formType, setFormType] = useState<"pdf" | "audio">("pdf");
  const [formPlan, setFormPlan] = useState<number>(0);
  const [formCategory, setFormCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formTrending, setFormTrending] = useState(false);
  const [formDownloadable, setFormDownloadable] = useState(true);
  const [formToc, setFormToc] = useState<ITocItem[]>([]);

  // Fetch Chapters & Categories
  const fetchData = async () => {
    try {
      setLoading(true);
      const [chRes, catRes] = await Promise.all([
        fetch("/api/admin/chapter"),
        fetch("/api/category"),
      ]);
      const chData = await chRes.json().catch(() => null);
      const catData = await catRes.json().catch(() => null);

      if (chData?.success) setChapters(chData.data || []);
      if (catData?.success) setCategories(catData.data || []);
    } catch (err) {
      console.error("Data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sub-categories available based on selected category
  const availableSubCategories = useMemo(() => {
    const parent = categories.find((c) => c._id === formCategory);
    return parent?.subCategories || [];
  }, [formCategory, categories]);

  const resetForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormDetails("");
    setFormMedia("");
    setFormCover("");
    setFormAuthor("");
    setFormType("pdf");
    setFormPlan(0);
    setFormCategory(categories[0]?._id || "");
    setFormSubCategory("");
    setFormTrending(false);
    setFormDownloadable(true);
    setFormToc([]);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (ch: IChapterItem) => {
    setEditingId(ch._id);
    setFormTitle(ch.title || "");
    setFormDetails(ch.details || "");
    setFormMedia(ch.media || "");
    setFormCover(ch.cover || "");
    setFormAuthor(ch.author || "");
    setFormType(ch.type || "pdf");
    setFormPlan(ch.for ?? 0);
    setFormCategory(typeof ch.category === "object" ? ch.category?._id : ch.category || "");
    setFormSubCategory(typeof ch.subCategory === "object" ? ch.subCategory?._id : ch.subCategory || "");
    setFormTrending(Boolean(ch.isTrending));
    setFormDownloadable(ch.isDownloadable ?? true);
    setFormToc(Array.isArray(ch.toc) ? ch.toc : []);
    setShowModal(true);
  };

  // TOC Handlers
  const addTocRow = () => {
    setFormToc((prev) => [...prev, { cut: "", title: "" }]);
  };

  const updateTocRow = (index: number, key: "cut" | "title", val: string) => {
    setFormToc((prev) => {
      const copy = [...prev];
      copy[index][key] = val;
      return copy;
    });
  };

  const removeTocRow = (index: number) => {
    setFormToc((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMedia.trim() || !formCover.trim() || !formAuthor.trim() || !formCategory) {
      alert("Please fill all required fields (Title, Author, Media URL, Cover URL, Category).");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        details: formDetails.trim(),
        media: formMedia.trim(),
        cover: formCover.trim(),
        author: formAuthor.trim(),
        type: formType,
        for: Number(formPlan),
        category: formCategory,
        subCategory: formSubCategory || null,
        isTrending: formTrending,
        isDownloadable: formDownloadable,
        toc: formToc.filter((t) => t.title.trim() && t.cut.trim()),
      };

      const url = editingId ? `/api/admin/chapter?id=${editingId}` : `/api/admin/chapter`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => null);

      if (resData?.success) {
        alert(editingId ? "Chapter updated successfully!" : "Chapter created successfully!");
        setShowModal(false);
        fetchData();
      } else {
        alert(resData?.message || "Operation failed.");
      }
    } catch (err: any) {
      alert(err?.message || "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete chapter "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/chapter?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        setChapters((prev) => prev.filter((c) => c._id !== id));
      } else {
        alert(data?.message || "Delete failed");
      }
    } catch (err) {
      alert("Error deleting chapter");
    }
  };

  const filteredChapters = useMemo(() => {
    if (!searchTerm.trim()) return chapters;
    const term = searchTerm.toLowerCase();
    return chapters.filter(
      (c) =>
        c.title?.toLowerCase().includes(term) ||
        c.author?.toLowerCase().includes(term) ||
        c.category?.name?.toLowerCase().includes(term)
    );
  }, [chapters, searchTerm]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f3f4f6", fontFamily: "sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, color: "#fff" }}>
              Chapter Management Hub
            </h1>
            <p style={{ color: "#9ca3af", margin: "6px 0 0", fontSize: "14px" }}>
              Create, edit, organize media PDFs/Audios, manage TOCs and subscription tiers.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/questions"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "#e5e7eb",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              ❓ Question Hub
            </Link>
            <Link
              href="/categories"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "#e5e7eb",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              📂 Categories
            </Link>
            <button
              onClick={openCreateModal}
              style={{
                backgroundColor: "#00D2B4",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              + Create Chapter
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "22px" }}>
          <input
            type="text"
            placeholder="Search by title, author, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "11px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.12)",
              backgroundColor: "#161d2d",
              color: "#fff",
              outline: "none",
              fontSize: "14px",
            }}
          />
        </div>

        {/* Chapters Grid */}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>Loading chapters...</div>
        ) : filteredChapters.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", backgroundColor: "#111827", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ color: "#9ca3af", margin: 0 }}>No chapters found. Click "+ Create Chapter" to add one.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "18px" }}>
            {filteredChapters.map((ch) => (
              <div
                key={ch._id}
                style={{
                  backgroundColor: "#111827",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "16px",
                  display: "flex",
                  gap: "14px",
                }}
              >
                <img
                  src={ch.cover}
                  alt={ch.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300";
                  }}
                  style={{
                    width: "80px",
                    height: "110px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    backgroundColor: "#161d2d",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: ch.type === "audio" ? "rgba(245, 158, 11, 0.15)" : "rgba(0, 210, 180, 0.15)",
                          color: ch.type === "audio" ? "#f59e0b" : "#00D2B4",
                        }}
                      >
                        {ch.type || "pdf"}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor: ch.for === 2 ? "rgba(239, 68, 68, 0.15)" : ch.for === 1 ? "rgba(59, 130, 246, 0.15)" : "rgba(255,255,255,0.06)",
                          color: ch.for === 2 ? "#ef4444" : ch.for === 1 ? "#3b82f6" : "#9ca3af",
                        }}
                      >
                        {ch.for === 2 ? "PRO" : ch.for === 1 ? "PLUS" : "FREE"}
                      </span>
                      {ch.isTrending && (
                        <span style={{ fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>
                          TRENDING
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: "2px 0 4px", fontSize: "16px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ch.title}
                    </h3>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#9ca3af" }}>
                      By {ch.author} • {ch.category?.name || "Uncategorized"}
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#6b7280" }}>
                      Questions: {ch.questions?.length || 0} • TOC: {ch.toc?.length || 0} cuts
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      onClick={() => openEditModal(ch)}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        backgroundColor: "rgba(255,255,255,0.08)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ch._id, ch.title)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        color: "#ef4444",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
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
                maxWidth: "760px",
                maxHeight: "90vh",
                overflowY: "auto",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 20px", color: "#fff" }}>
                {editingId ? "Edit Chapter" : "Create New Chapter"}
              </h2>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Row 1: Title & Author */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marvel Chronicles: Rise of Avengers"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                      Author / Creator *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stan Lee & Jack Kirby"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Details */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                    Details / Overview *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Chapter summary and synopsis..."
                    value={formDetails}
                    onChange={(e) => setFormDetails(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Row 2: Media URL & Cover URL */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                      Media File URL (PDF or Audio stream) *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://.../book.pdf"
                      value={formMedia}
                      onChange={(e) => setFormMedia(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                      Cover Image URL *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://images.unsplash.com/..."
                      value={formCover}
                      onChange={(e) => setFormCover(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Row 3: Category & Subcategory */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        setFormCategory(e.target.value);
                        setFormSubCategory("");
                      }}
                      required
                      style={inputStyle}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                      Sub-Category (Optional)
                    </label>
                    <select
                      value={formSubCategory}
                      onChange={(e) => setFormSubCategory(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">-- None --</option>
                      {availableSubCategories.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Type, Plan, Trending, Downloadable */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>
                      Type
                    </label>
                    <select value={formType} onChange={(e: any) => setFormType(e.target.value)} style={inputStyle}>
                      <option value="pdf">PDF</option>
                      <option value="audio">Audio</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>
                      Plan Tier
                    </label>
                    <select value={formPlan} onChange={(e) => setFormPlan(Number(e.target.value))} style={inputStyle}>
                      <option value={0}>Free (0)</option>
                      <option value={1}>Plus (1)</option>
                      <option value={2}>Pro (2)</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "18px" }}>
                    <input
                      type="checkbox"
                      id="trendingBox"
                      checked={formTrending}
                      onChange={(e) => setFormTrending(e.target.checked)}
                      style={{ accentColor: "#00D2B4", width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="trendingBox" style={{ fontSize: "13px", color: "#fff", cursor: "pointer" }}>
                      Trending?
                    </label>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "18px" }}>
                    <input
                      type="checkbox"
                      id="downloadBox"
                      checked={formDownloadable}
                      onChange={(e) => setFormDownloadable(e.target.checked)}
                      style={{ accentColor: "#00D2B4", width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="downloadBox" style={{ fontSize: "13px", color: "#fff", cursor: "pointer" }}>
                      Downloadable?
                    </label>
                  </div>
                </div>

                {/* Table of Contents (TOC) Dynamic Manager */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#00D2B4" }}>
                        Table of Contents (TOC)
                      </span>
                      <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "8px" }}>
                        ({formToc.length} entries)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addTocRow}
                      style={{
                        background: "rgba(0, 210, 180, 0.12)",
                        color: "#00D2B4",
                        border: "1px solid rgba(0, 210, 180, 0.25)",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      + Add TOC Entry
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" }}>
                    {formToc.map((tocItem, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="Page / Cut # (e.g. 1)"
                          value={tocItem.cut}
                          onChange={(e) => updateTocRow(idx, "cut", e.target.value)}
                          style={{ ...inputStyle, width: "120px" }}
                        />
                        <input
                          type="text"
                          placeholder="Chapter title / section name"
                          value={tocItem.title}
                          onChange={(e) => updateTocRow(idx, "title", e.target.value)}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => removeTocRow(idx)}
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "#ef4444",
                            border: "none",
                            borderRadius: "6px",
                            padding: "8px 12px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "10px 18px",
                      backgroundColor: "transparent",
                      color: "#9ca3af",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: "10px 24px",
                      backgroundColor: "#00D2B4",
                      color: "#000",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: submitting ? "not-allowed" : "pointer",
                      fontSize: "13px",
                    }}
                  >
                    {submitting ? "Saving..." : editingId ? "Update Chapter" : "Create Chapter"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.12)",
  backgroundColor: "#0b0f19",
  color: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "13px",
};