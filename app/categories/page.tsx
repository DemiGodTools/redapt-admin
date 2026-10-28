// File: app/categories/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { uploadFileSmart } from "@/lib/clientUpload";

interface ICategoryItem {
  _id: string;
  name: string;
  image: string;
  description?: string;
  parentCategory?: string | null;
  subCategories?: ICategoryItem[];
  order?: number;
}

const DEFAULT_IMG = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&auto=format&fit=crop&q=60";

// Clean SVG Icons
const Icons = {
  ChevronDown: ({ open }: { open?: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Search: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Upload: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
};

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<ICategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // RBAC Check State for Categories
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("adminRole");
    const accessData = localStorage.getItem("adminAccess");
    
    if (role === "master_admin") {
      setCanEdit(true); 
    } else if (accessData) {
      try {
        const access = JSON.parse(accessData);
        if (access.categories === "edit" || (!access.categories && access.dashboard === "edit")) { 
          setCanEdit(true); 
        }
      } catch (e) {
        console.error("Failed to parse access data");
      }
    }
  }, []);

  // Form states
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [parentCategory, setParentCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  // Upload states with real-time percentage
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Accordion & Search State
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/category");
      const json = await res.json();
      if (json.success) {
        setCategories(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleResetForm = () => {
    setName("");
    setImage("");
    setDescription("");
    setParentCategory("");
    setEditingId(null);
    setUploadingImage(false);
    setUploadProgress(null);
    setShowFormModal(false);
  };

  // Upload handler with Backblaze B2 smart uploader
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setUploadProgress(0);
    try {
      const url = await uploadFileSmart(file, "categories", (pct) => setUploadProgress(pct));
      setImage(url);
    } catch (err: any) {
      alert(err?.message || "Error uploading category image");
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Please enter category name");

    try {
      setIsSubmitting(true);
      const payload = {
        ...(editingId && { id: editingId }),
        name: name.trim(),
        image: image.trim() || DEFAULT_IMG,
        description: description.trim(),
        parentCategory: parentCategory || null,
      };

      const res = await fetch("/api/category", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        handleResetForm();
        fetchCategories();
      } else {
        alert(json.message || "Operation failed");
      }
    } catch (err) {
      alert("Error saving category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = (preselectedParentId?: string) => {
    handleResetForm();
    if (preselectedParentId) {
      setParentCategory(preselectedParentId);
    }
    setShowFormModal(true);
  };

  const handleEdit = (cat: ICategoryItem, parentId?: string) => {
    setEditingId(cat._id);
    setName(cat.name);
    setImage(cat.image || "");
    setDescription(cat.description || "");
    setParentCategory(parentId || cat.parentCategory || "");
    setShowFormModal(true);
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete "${catName}"?`)) return;

    try {
      const res = await fetch(`/api/category?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchCategories();
      } else {
        alert(json.message || "Failed to delete");
      }
    } catch (err) {
      alert("Error deleting category");
    }
  };

  const toggleExpand = (catId: string) => {
    setExpandedCatId((prev) => (prev === catId ? null : catId));
  };

  // Filtered categories and subcategories based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase();

    return categories
      .map((cat) => {
        const catMatch = cat.name.toLowerCase().includes(term);
        const matchedSubs = (cat.subCategories || []).filter((sub) =>
          sub.name.toLowerCase().includes(term)
        );

        if (catMatch || matchedSubs.length > 0) {
          return {
            ...cat,
            subCategories: catMatch ? cat.subCategories : matchedSubs,
          };
        }
        return null;
      })
      .filter(Boolean) as ICategoryItem[];
  }, [categories, searchTerm]);

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          
          {/* Top Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
                  Category Manager
                </h1>
                <span style={{ fontSize: "12px", background: "rgba(0, 210, 180, 0.15)", color: "#00D2B4", padding: "4px 10px", borderRadius: "12px", fontWeight: 600 }}>
                  {categories.length} Main Categories
                </span>
              </div>
              <p style={{ color: "#9ca3af", margin: 0, fontSize: "14px" }}>
                Organize main book categories and nested sub-categories with 16:9 media covers.
              </p>
            </div>

            {canEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => handleOpenCreate()}
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
                  }}
                >
                  <Icons.Plus /> Add Category
                </button>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ position: "relative", maxWidth: "420px" }}>
               <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none", display: "flex" }}>
                  <Icons.Search />
               </div>
               <input
                 type="text"
                 placeholder="Search categories or sub-categories..."
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
          </div>

          {/* Category List with Expand/Collapse Accordion */}
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>Loading categories...</div>
          ) : filteredCategories.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "#111827", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ color: "#9ca3af", margin: 0 }}>No categories found matching your search.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredCategories.map((cat) => {
                const isExpanded = expandedCatId === cat._id || (searchTerm.trim().length > 0 && (cat.subCategories?.length || 0) > 0);
                const subCount = cat.subCategories?.length || 0;

                return (
                  <div
                    key={cat._id}
                    style={{
                      backgroundColor: "#111827",
                      borderRadius: "12px",
                      border: isExpanded ? "1px solid rgba(0, 210, 180, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                      overflow: "hidden",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    {/* Category Card Header */}
                    <div
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        backgroundColor: isExpanded ? "rgba(0, 210, 180, 0.03)" : "transparent",
                      }}
                      onClick={() => toggleExpand(cat._id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: "72px",
                            aspectRatio: "16 / 9",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid rgba(255,255,255,0.12)",
                            backgroundColor: "#1a2234",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={cat.image || DEFAULT_IMG}
                            alt={cat.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
                            }}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 600, color: "#fff" }}>
                              {cat.name}
                            </h3>
                            <span
                              style={{
                                fontSize: "11px",
                                color: subCount > 0 ? "#00D2B4" : "#9ca3af",
                                backgroundColor: subCount > 0 ? "rgba(0, 210, 180, 0.12)" : "rgba(255,255,255,0.06)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontWeight: 600,
                              }}
                            >
                              {subCount} Sub-categories
                            </span>
                          </div>
                          {cat.description ? (
                            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "550px" }}>
                              {cat.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Action Buttons & Expand Toggle */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }} onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <div style={{ display: "flex", gap: "8px", marginRight: "12px" }}>
                            <button
                              onClick={() => handleOpenCreate(cat._id)}
                              style={actionBtnStyle}
                              title="Add Sub-category"
                            >
                              <Icons.Plus /> Sub
                            </button>
                            <button
                              onClick={() => handleEdit(cat)}
                              style={actionBtnStyle}
                            >
                              <Icons.Edit />
                            </button>
                            <button
                              onClick={() => handleDelete(cat._id, cat.name)}
                              style={{ ...actionBtnStyle, backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        )}

                        <div
                          onClick={() => toggleExpand(cat._id)}
                          style={{
                            color: isExpanded ? "#00D2B4" : "#9ca3af",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "6px",
                            cursor: "pointer",
                            userSelect: "none",
                            transition: "color 0.2s"
                          }}
                        >
                          <Icons.ChevronDown open={isExpanded} />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Sub-categories Panel with 16:9 Aspect Ratio Grid */}
                    {isExpanded && (
                      <div style={{ padding: "18px 20px 22px", borderTop: "1px solid rgba(255,255,255,0.06)", backgroundColor: "#0c111d" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                            Sub-Categories inside {cat.name} ({subCount})
                          </span>
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>
                            Display Ratio: 16:9 Aspect
                          </span>
                        </div>

                        {subCount === 0 ? (
                          <div style={{ padding: "28px 20px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                            <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 10px" }}>No sub-categories linked yet.</p>
                            {canEdit && (
                              <button
                                onClick={() => handleOpenCreate(cat._id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#00D2B4",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                              >
                                + Create first sub-category
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
                            {cat.subCategories!.map((sub) => (
                              <div
                                key={sub._id}
                                style={{
                                  backgroundColor: "#151c2c",
                                  borderRadius: "10px",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  overflow: "hidden",
                                  display: "flex",
                                  flexDirection: "column",
                                  boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
                                  transition: "transform 0.2s ease, border-color 0.2s ease",
                                }}
                              >
                                {/* 16:9 Image Container */}
                                <div
                                  style={{
                                    width: "100%",
                                    aspectRatio: "16 / 9",
                                    overflow: "hidden",
                                    position: "relative",
                                    backgroundColor: "#0b0f19",
                                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                                  }}
                                >
                                  <img
                                    src={sub.image || DEFAULT_IMG}
                                    alt={sub.name}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
                                    }}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                  <span
                                    style={{
                                      position: "absolute",
                                      bottom: "6px",
                                      right: "8px",
                                      backgroundColor: "rgba(0,0,0,0.7)",
                                      backdropFilter: "blur(4px)",
                                      color: "#9ca3af",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    16:9
                                  </span>
                                </div>

                                {/* Card Body */}
                                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", gap: "10px" }}>
                                  <div>
                                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "4px", lineHeight: "1.3" }}>
                                      {sub.name}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                                      ID: {sub._id.slice(-6)}
                                    </div>
                                  </div>

                                  {canEdit && (
                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                      <button
                                        onClick={() => handleEdit(sub, cat._id)}
                                        style={{
                                          background: "rgba(255,255,255,0.06)",
                                          color: "#e5e7eb",
                                          border: "none",
                                          borderRadius: "6px",
                                          padding: "5px 10px",
                                          fontSize: "12px",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                        }}
                                        title="Edit Subcategory"
                                      >
                                        <Icons.Edit /> Edit
                                      </button>
                                      <button
                                        onClick={() => handleDelete(sub._id, sub.name)}
                                        style={{
                                          background: "rgba(239, 68, 68, 0.15)",
                                          color: "#ef4444",
                                          border: "none",
                                          borderRadius: "6px",
                                          padding: "5px 10px",
                                          fontSize: "12px",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                        }}
                                        title="Delete Subcategory"
                                      >
                                        <Icons.Trash /> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal: Create / Edit Category with Backblaze Upload & 16:9 Preview */}
          {showFormModal && (
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
                  maxWidth: "540px",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
                }}
              >
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 18px", color: "#fff" }}>
                  {editingId ? "Edit Category" : parentCategory ? "Create Sub-Category (16:9)" : "Create Main Category"}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "6px" }}>
                      Parent Category
                    </label>
                    <select
                      value={parentCategory}
                      onChange={(e) => setParentCategory(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">-- None (This will be a Main Category) --</option>
                      {categories
                        .filter((c) => c._id !== editingId)
                        .map((c) => (
                          <option key={c._id} value={c._id}>
                            Main: {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "6px" }}>
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Science Fiction, Psychology, Anime"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  {/* Cover Image Input with Backblaze B2 Upload Button & Live 16:9 Preview */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#9ca3af" }}>
                        Cover Image (16:9 Aspect Ratio)
                      </label>
                      <span style={{ fontSize: "11px", color: "#00D2B4", fontWeight: 600 }}>
                        16:9 Recommended
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
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
                          userSelect: "none",
                          transition: "all 0.2s",
                        }}
                      >
                        <Icons.Upload />
                        {uploadingImage
                          ? (uploadProgress !== null ? `Uploading ${uploadProgress}%` : "Uploading...")
                          : "Upload Image"}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImage}
                          onChange={handleFileUpload}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>

                    {/* Live 16:9 Preview Banner in Form */}
                    {image.trim() ? (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>
                          16:9 Preview:
                        </div>
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "16 / 9",
                            maxHeight: "150px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid rgba(255,255,255,0.12)",
                            backgroundColor: "#0b0f19",
                          }}
                        >
                          <img
                            src={image}
                            alt="16:9 Cover Preview"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
                            }}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "6px" }}>
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief description about this category..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      style={{
                        padding: "9px 16px",
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
                      disabled={isSubmitting || uploadingImage}
                      style={{
                        padding: "9px 20px",
                        backgroundColor: "#00D2B4",
                        color: "#000",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: 700,
                        cursor: (isSubmitting || uploadingImage) ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        opacity: (isSubmitting || uploadingImage) ? 0.7 : 1,
                      }}
                    >
                      {isSubmitting ? "Saving..." : editingId ? "Update Category" : "Create Category"}
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
  fontSize: "13px"
};

const actionBtnStyle: React.CSSProperties = {
  padding: "6px 12px",
  backgroundColor: "rgba(255,255,255,0.07)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: "6px"
};
