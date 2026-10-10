"use client";

import React, { useEffect, useState } from "react";

interface ICategoryItem {
  _id: string;
  name: string;
  image: string;
  description?: string;
  parentCategory?: string | null;
  subCategories?: ICategoryItem[];
  order?: number;
}

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Please enter category name");

    try {
      setIsSubmitting(true);
      const payload = {
        ...(editingId && { id: editingId }),
        name,
        image: image || "https://placeholder.co/300x300/222/FFF.png?text=Category",
        description,
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

  const handleEdit = (cat: ICategoryItem, parentId?: string) => {
    setEditingId(cat._id);
    setName(cat.name);
    setImage(cat.image || "");
    setDescription(cat.description || "");
    setParentCategory(parentId || cat.parentCategory || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 26, fontWeight: "bold", marginBottom: 8, color: "#111" }}>
        Category & Sub-Category Manager
      </h1>
      <p style={{ color: "#666", marginBottom: 30 }}>
        Manage main categories and nested sub-categories without touching MongoDB database directly.
      </p>

      {/* Form Card */}
      <div style={{ background: "#f8f9fa", padding: 24, borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 40 }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 18, color: "#1f2937" }}>
          {editingId ? "Edit Category" : "Create Category / Sub-Category"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Parent Category (Choose for Sub-Category, leave empty for Main Category)
            </label>
            <select
              value={parentCategory}
              onChange={(e) => setParentCategory(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #ccc" }}
            >
              <option value="">-- None (This will be a Main Category) --</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  Main: {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Physics, Algebra, Machine Learning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #ccc" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Image URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={image}
              onChange={(e) => setImage(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #ccc" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Description
            </label>
            <textarea
              placeholder="Brief summary..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: editingId ? "#2563eb" : "#059669",
                color: "#fff",
                border: "none",
                padding: "10px 22px",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isSubmitting ? "Saving..." : editingId ? "Update Category" : "Create Category"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                style={{
                  background: "#e5e7eb",
                  color: "#374151",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Category Tree List */}
      <div>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Existing Categories Tree</h2>
        {loading ? (
          <p style={{ color: "#666" }}>Loading categories...</p>
        ) : categories.length === 0 ? (
          <p style={{ color: "#666" }}>No categories yet. Create your first one above!</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {categories.map((cat) => (
              <div
                key={cat._id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 16,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Main Category Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={cat.image || "https://placeholder.co/60"}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }}
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: 17, color: "#111" }}>{cat.name}</h4>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
                        {cat.subCategories?.length || 0} Sub-categories • ID: {cat._id}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleEdit(cat)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat._id, cat.name)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontSize: 13 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Sub-Categories Chip Grid */}
                {cat.subCategories && cat.subCategories.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed #e5e7eb" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>
                      Sub-Categories
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {cat.subCategories.map((sub) => (
                        <div
                          key={sub._id}
                          style={{
                            background: "#f3f4f6",
                            padding: "6px 12px",
                            borderRadius: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 13,
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{sub.name}</span>
                          <span
                            onClick={() => handleEdit(sub, cat._id)}
                            style={{ cursor: "pointer", color: "#2563eb", fontSize: 12 }}
                            title="Edit Subcategory"
                          >
                            ✎
                          </span>
                          <span
                            onClick={() => handleDelete(sub._id, sub.name)}
                            style={{ cursor: "pointer", color: "#dc2626", fontSize: 12 }}
                            title="Delete Subcategory"
                          >
                            ✕
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}