"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface ICategoryItem {
  _id: string;
  name: string;
  image: string;
  description?: string;
  parentCategory?: string | null;
  subCategories?: ICategoryItem[];
  order?: number;
}

const DEFAULT_IMG = "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&auto=format&fit=crop&q=60";

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<ICategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [parentCategory, setParentCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

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
    setShowFormModal(false);
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
    <div style={{ minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f3f4f6", fontFamily: "sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, color: "#fff" }}>
                Category Manager
              </h1>
              <span style={{ fontSize: "12px", background: "rgba(0, 210, 180, 0.15)", color: "#00D2B4", padding: "4px 10px", borderRadius: "12px", fontWeight: "600" }}>
                {categories.length} Main Categories
              </span>
            </div>
            <p style={{ color: "#9ca3af", margin: 0, fontSize: "14px" }}>
              Organize main book categories and nested sub-categories with media covers.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/questions"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                color: "#e5e7eb",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              ← Questions Hub
            </Link>
            <button
              onClick={() => handleOpenCreate()}
              style={{
                backgroundColor: "#00D2B4",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              + Add Category
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            placeholder="Search categories or sub-categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "420px",
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
                      <img
                        src={cat.image || DEFAULT_IMG}
                        alt={cat.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
                        }}
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "10px",
                          objectFit: "cover",
                          border: "1px solid rgba(255,255,255,0.1)",
                          backgroundColor: "#1a2234",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "600", color: "#fff" }}>
                            {cat.name}
                          </h3>
                          <span
                            style={{
                              fontSize: "11px",
                              color: subCount > 0 ? "#00D2B4" : "#9ca3af",
                              backgroundColor: subCount > 0 ? "rgba(0, 210, 180, 0.12)" : "rgba(255,255,255,0.06)",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontWeight: "600",
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenCreate(cat._id)}
                        style={{
                          background: "rgba(0, 210, 180, 0.1)",
                          color: "#00D2B4",
                          border: "1px solid rgba(0, 210, 180, 0.25)",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                        title="Add Sub-category under this category"
                      >
                        + Add Sub
                      </button>
                      <button
                        onClick={() => handleEdit(cat)}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.1)",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat._id, cat.name)}
                        style={{
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                      <div
                        onClick={() => toggleExpand(cat._id)}
                        style={{
                          padding: "6px 8px",
                          color: "#9ca3af",
                          fontSize: "14px",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Sub-categories Panel */}
                  {isExpanded && (
                    <div style={{ padding: "16px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", backgroundColor: "#0e1320" }}>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
                        Sub-Categories inside {cat.name} ({subCount})
                      </div>

                      {subCount === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                          <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 10px" }}>No sub-categories linked yet.</p>
                          <button
                            onClick={() => handleOpenCreate(cat._id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#00D2B4",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            + Create first sub-category
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                          {cat.subCategories!.map((sub) => (
                            <div
                              key={sub._id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 14px",
                                backgroundColor: "#161d2d",
                                borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <img
                                src={sub.image || DEFAULT_IMG}
                                alt={sub.name}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_IMG;
                                }}
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "6px",
                                  objectFit: "cover",
                                  backgroundColor: "#0b0f19",
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {sub.name}
                                </div>
                                <div style={{ fontSize: "11px", color: "#6b7280" }}>
                                  ID: {sub._id.slice(-6)}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  onClick={() => handleEdit(sub, cat._id)}
                                  style={{
                                    background: "rgba(255,255,255,0.06)",
                                    color: "#e5e7eb",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                  title="Edit Subcategory"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => handleDelete(sub._id, sub.name)}
                                  style={{
                                    background: "rgba(239, 68, 68, 0.15)",
                                    color: "#ef4444",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                  title="Delete Subcategory"
                                >
                                  ✕
                                </button>
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

        {/* Modal: Create / Edit Category */}
        {showFormModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.75)",
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
                maxWidth: "520px",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 18px", color: "#fff" }}>
                {editingId ? "Edit Category" : parentCategory ? "Create Sub-Category" : "Create Main Category"}
              </h2>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                    Parent Category
                  </label>
                  <select
                    value={parentCategory}
                    onChange={(e) => setParentCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backgroundColor: "#0b0f19",
                      color: "#fff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
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
                  <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Fiction, Psychology, Anime"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backgroundColor: "#0b0f19",
                      color: "#fff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backgroundColor: "#0b0f19",
                      color: "#fff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description about this category..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backgroundColor: "#0b0f19",
                      color: "#fff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
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
                    disabled={isSubmitting}
                    style={{
                      padding: "9px 20px",
                      backgroundColor: "#00D2B4",
                      color: "#000",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      fontSize: "13px",
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
  );
}