// File: app/series/page.tsx (Admin Series & Framework Hub)
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";
import { uploadFileSmart } from "@/lib/clientUpload";

interface ISeriesItem {
  _id: string;
  title: string;
  description: string;
  cover: string;
  for: number; 
  category: any;
  subCategory?: any;
  type?: string;
  author?: string;
  recommendationBookId?: any;
  recommendationText?: string;
  chapters?: any[];
  createdAt?: string;
}

interface ICategory {
  _id: string;
  name: string;
  subCategories?: { _id: string; name: string }[];
}

interface IDropdownOption {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  group?: string;
}

// -------------------------------------------------------------
// CLEAN SVG ICONS
// -------------------------------------------------------------
const Icons = {
  Search: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  ChevronDown: ({ open }: { open?: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>,
  Info: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  Close: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Upload: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Check: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00D2B4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Calendar: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  User: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Layers: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  Folder: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  Grip: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "grab" }}><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="15" x2="16" y2="15"></line></svg>,
  MusicIcon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
  DocIcon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
};

const badgePalette: Record<string, { bg: string; text: string; border: string }> = {
  purple: { bg: "rgba(168, 85, 247, 0.14)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
  amber: { bg: "rgba(245, 158, 11, 0.14)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
  teal: { bg: "rgba(0, 210, 180, 0.14)", text: "#00D2B4", border: "rgba(0, 210, 180, 0.3)" },
  blue: { bg: "rgba(59, 130, 246, 0.14)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
  gray: { bg: "rgba(255, 255, 255, 0.06)", text: "#9ca3af", border: "rgba(255, 255, 255, 0.12)" },
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// -------------------------------------------------------------
// CUSTOM DROPDOWN
// -------------------------------------------------------------
function CustomDropdown({ value, onChange, options, placeholder = "Select...", minWidth = "160px" }: { value: string; onChange: (val: string) => void; options: IDropdownOption[]; placeholder?: string; minWidth?: string; }) {
  const [open, setOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => String(o.value) === String(value));
  const visibleOptions = useMemo(() => {
    if (!internalSearch.trim()) return options;
    const term = internalSearch.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term) || o.badge?.toLowerCase().includes(term));
  }, [options, internalSearch]);

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth, flex: "1 1 auto" }}>
      <button type="button" onClick={() => { setOpen((prev) => !prev); setInternalSearch(""); }} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: open ? "1px solid rgba(0, 210, 180, 0.5)" : "1px solid rgba(255,255,255,0.12)", backgroundColor: "#0b0f19", color: selectedOption ? "#f3f4f6" : "#9ca3af", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", cursor: "pointer", textAlign: "left", transition: "border-color 0.15s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedOption ? selectedOption.label : placeholder}</span>
          {selectedOption?.badge && (
            <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", backgroundColor: badgePalette[selectedOption.badgeColor || "gray"].bg, color: badgePalette[selectedOption.badgeColor || "gray"].text, border: `1px solid ${badgePalette[selectedOption.badgeColor || "gray"].border}`, textTransform: "uppercase", flexShrink: 0 }}>{selectedOption.badge}</span>
          )}
        </div>
        <Icons.ChevronDown open={open} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, minWidth: "220px", backgroundColor: "#141c2b", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", boxShadow: "0 14px 34px rgba(0,0,0,0.75)", zIndex: 99999, overflow: "hidden" }}>
          {options.length > 6 && (
            <div style={{ padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <input type="text" placeholder="Filter options..." value={internalSearch} onChange={(e) => setInternalSearch(e.target.value)} autoFocus style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0b0f19", color: "#fff", fontSize: "12px", outline: "none", boxSizing: "border-box" }} />
            </div>
          )}
          <div style={{ maxHeight: "250px", overflowY: "auto", padding: "4px" }}>
            {visibleOptions.length === 0 ? <div style={{ padding: "12px", textAlign: "center", color: "#6b7280", fontSize: "12px" }}>No matching options</div> : visibleOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const prevGroup = idx > 0 ? visibleOptions[idx - 1].group : undefined;
              const showGroupHeader = opt.group && opt.group !== prevGroup;
              return (
                <React.Fragment key={`${opt.value}-${idx}`}>
                  {showGroupHeader && <div style={{ padding: "6px 10px 4px", fontSize: "10px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{opt.group}</div>}
                  <button type="button" onClick={() => { onChange(opt.value); setOpen(false); }} style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "none", backgroundColor: isSelected ? "rgba(0, 210, 180, 0.12)" : "transparent", color: isSelected ? "#00D2B4" : "#e5e7eb", fontSize: "13px", fontWeight: isSelected ? 600 : 400, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", cursor: "pointer", textAlign: "left" }} onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }} onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent"; }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      {opt.badge && <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", backgroundColor: badgePalette[opt.badgeColor || "gray"].bg, color: badgePalette[opt.badgeColor || "gray"].text, border: `1px solid ${badgePalette[opt.badgeColor || "gray"].border}`, textTransform: "uppercase" }}>{opt.badge}</span>}
                      {isSelected && <Icons.Check />}
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------
export default function SeriesAdminPage() {
  const [seriesList, setSeriesList] = useState<ISeriesItem[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // ⚡ RBAC Check State for Series
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    // ⚡ Local Storage se role aur permissions nikal kar 'canEdit' set karna
    const role = localStorage.getItem("adminRole");
    const accessData = localStorage.getItem("adminAccess");
    
    if (role === "master_admin") {
      setCanEdit(true); // Master Admin gets full access
    } else if (accessData) {
      try {
        const access = JSON.parse(accessData);
        if (access.series === "edit") { // Notice: Check for 'series' module here
          setCanEdit(true); 
        }
      } catch (e) {
        console.error("Failed to parse access data");
      }
    }
  }, []);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Main Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCover, setFormCover] = useState("");
  const [formType, setFormType] = useState<"normal" | "framework">("normal");
  const [formPlan, setFormPlan] = useState<number>(0);
  const [formCategory, setFormCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formAuthor, setFormAuthor] = useState(""); 
  
  // Framework specific
  const [formRecommendationId, setFormRecommendationId] = useState("");
  const [formRecommendationText, setFormRecommendationText] = useState("");

  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const detailPopoverRef = useRef<HTMLDivElement>(null);

  // ⚡ CHAPTER DRAG & DROP MANAGER STATE (MUSIC QUEUE STYLE)
  const [managingSeries, setManagingSeries] = useState<ISeriesItem | null>(null);
  const [assignedChapters, setAssignedChapters] = useState<any[]>([]);
  const [savingChapters, setSavingChapters] = useState(false);
  const [chapterToAdd, setChapterToAdd] = useState("");
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (detailPopoverRef.current && !detailPopoverRef.current.contains(e.target as Node)) {
        setActiveDetailId(null);
      }
    };
    if (activeDetailId) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeDetailId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [serRes, catRes, chapRes] = await Promise.all([
        fetch("/api/admin/series"),
        fetch("/api/category"),
        fetch("/api/admin/chapter")
      ]);
      const serData = await serRes.json().catch(()=>null);
      const catData = await catRes.json().catch(()=>null);
      const chapData = await chapRes.json().catch(()=>null);

      if (serData?.success) setSeriesList(serData.data || []);
      if (catData?.success) setCategories(catData.data || []);
      if (chapData?.success) setAllChapters(chapData.data || []);
    } catch (err) {
      console.error("Data load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const availableSubCategories = useMemo(() => {
    const parent = categories.find((c) => c._id === formCategory);
    return parent?.subCategories || [];
  }, [formCategory, categories]);

  const resetForm = () => {
    setEditingId(null);
    setFormTitle(""); setFormDesc(""); setFormCover("");
    setFormType("normal"); setFormPlan(0);
    setFormCategory(categories[0]?._id || ""); setFormSubCategory("");
    setFormAuthor(""); setFormRecommendationId(""); setFormRecommendationText("");
    setUploadingCover(false);
  };

  const openCreateModal = () => { resetForm(); setShowModal(true); };

  const openEditModal = (s: ISeriesItem) => {
    setEditingId(s._id);
    setFormTitle(s.title || ""); setFormDesc(s.description || ""); setFormCover(s.cover || "");
    setFormType((s.type as "normal" | "framework") || "normal"); setFormPlan(s.for ?? 0);
    setFormCategory(typeof s.category === "object" ? s.category?._id : s.category || "");
    setFormSubCategory(typeof s.subCategory === "object" ? s.subCategory?._id : s.subCategory || "");
    setFormAuthor(s.author || "");
    setFormRecommendationId(typeof s.recommendationBookId === "object" ? s.recommendationBookId?._id : s.recommendationBookId || "");
    setFormRecommendationText(s.recommendationText || "");
    setActiveDetailId(null); setShowModal(true);
  };

  const openChapterManager = (s: ISeriesItem) => {
    setManagingSeries(s);
    const mapped = allChapters.filter(ch => {
      const sId = typeof ch.series === "object" ? ch.series?._id : ch.series;
      if (String(sId) === String(s._id)) return true;
      if (s.chapters && Array.isArray(s.chapters)) {
        return s.chapters.some((item: any) => {
          const contentId = typeof item.content === "object" ? item.content?._id : item.content;
          return String(contentId) === String(ch._id);
        });
      }
      return false;
    });

    if (s.chapters && Array.isArray(s.chapters)) {
      mapped.sort((a, b) => {
        const orderA = s.chapters!.find((item: any) => String(item.content?._id || item.content) === String(a._id))?.order || 999;
        const orderB = s.chapters!.find((item: any) => String(item.content?._id || item.content) === String(b._id))?.order || 999;
        return orderA - orderB;
      });
    }

    setAssignedChapters(mapped);
    setChapterToAdd("");
  };

  // ⚡ DND HANDLERS (Smooth Music Queue Type)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    // Set a transparent drag image to allow custom styling feedback
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => setDraggingIdx(index), 0);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
    if (dragItem.current !== null && dragItem.current !== index) {
      const newList = [...assignedChapters];
      const dragged = newList[dragItem.current];
      newList.splice(dragItem.current, 1);
      newList.splice(index, 0, dragged);
      
      dragItem.current = index;
      setAssignedChapters(newList);
    }
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingIdx(null);
  };

  const handleAddChapterToSeries = () => {
    if (!chapterToAdd) return;
    const ch = allChapters.find(c => String(c._id) === String(chapterToAdd));
    if (ch && !assignedChapters.some(a => String(a._id) === String(ch._id))) {
      setAssignedChapters([...assignedChapters, ch]);
    }
    setChapterToAdd("");
  };

  const handleRemoveChapterFromSeries = (id: string) => {
    setAssignedChapters(assignedChapters.filter(c => String(c._id) !== String(id)));
  };

  const handleSaveChapterOrder = async () => {
    if (!managingSeries) return;
    setSavingChapters(true);
    try {
      const updatedChaptersPayload = assignedChapters.map((ch, idx) => ({
        content: ch._id,
        contentModel: "Chapter",
        order: idx + 1
      }));

      const url = `/api/admin/series/update/${managingSeries._id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters: updatedChaptersPayload }),
      });

      const resData = await res.json().catch(() => null);
      if (resData?.success) {
        alert("Chapter order and assignments saved successfully!");
        setManagingSeries(null);
        fetchData();
      } else {
        alert(resData?.message || "Failed to save chapter order.");
      }
    } catch (err: any) {
      alert("Server error while saving order.");
    } finally {
      setSavingChapters(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.url) {
        setFormCover(data.url);
        alert(`Cover image uploaded successfully!`);
      } else { alert(data?.message || "File upload failed"); }
    } catch (err: any) { alert(err?.message || "Error uploading file"); } finally {
      setUploadingCover(false); e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCover.trim() || !formCategory || !formAuthor.trim()) {
      alert("Please fill all required fields including Author.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(), description: formDesc.trim(), cover: formCover.trim(),
        type: formType, for: Number(formPlan), category: formCategory, subCategory: formSubCategory || null,
        author: formAuthor.trim(),
        recommendationBookId: formType === "framework" ? formRecommendationId : null,
        recommendationText: formType === "framework" ? formRecommendationText.trim() : "",
      };
      
      const url = editingId ? `/api/admin/series/update/${editingId}` : `/api/admin/series/create`;
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(() => null);
      if (resData?.success) {
        alert(editingId ? "Collection updated successfully!" : "Collection created successfully!");
        setShowModal(false); fetchData();
      } else { alert(resData?.message || "Operation failed."); }
    } catch (err: any) { alert(err?.message || "Server error"); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/series?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (data?.success) setSeriesList((prev) => prev.filter((s) => s._id !== id));
      else alert(data?.message || "Delete failed");
    } catch (err) { alert("Error deleting series"); }
  };

  const filteredSeries = useMemo(() => {
    let result = seriesList;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => s.title?.toLowerCase().includes(term) || (typeof s.category === 'object' && s.category?.name?.toLowerCase().includes(term)) || s.author?.toLowerCase().includes(term));
    }
    if (filterType !== "all") result = result.filter(s => (s.type || "normal") === filterType);
    if (filterCategory !== "all") result = result.filter(s => { const catId = typeof s.category === "object" ? s.category?._id : s.category; return String(catId) === String(filterCategory); });
    result = [...result].sort((a, b) => {
      if (sortBy === "a-z") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "z-a") return (b.title || "").localeCompare(a.title || "");
      if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      return new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime();
    });
    return result;
  }, [seriesList, searchTerm, filterType, filterCategory, sortBy]);

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>Series & Framework Hub</h1>
              <p style={{ color: "#9ca3af", margin: "6px 0 0", fontSize: "13px" }}>Showing <strong style={{ color: "#fff" }}>{filteredSeries.length}</strong> of {seriesList.length} total collections</p>
            </div>
            
            {/* ⚡ HIDE CREATE BUTTON IF NOT canEdit */}
            {canEdit && (
              <button onClick={openCreateModal} style={{ backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <Icons.Plus /> Create Collection
              </button>
            )}
          </div>

          <div style={{ marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "10px", backgroundColor: "#111827", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", alignItems: "center" }}>
            <div style={{ flex: "1 1 240px", position: "relative", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: "12px", color: "#6b7280", pointerEvents: "none", display: "flex" }}><Icons.Search /></div>
              <input type="text" placeholder="Search series, framework, author..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...filterInputStyle, paddingLeft: "36px" }} />
            </div>
            <CustomDropdown value={filterType} onChange={setFilterType} options={[ { value: "all", label: "All Types" }, { value: "normal", label: "Normal Series", badge: "SERIES", badgeColor: "purple" }, { value: "framework", label: "Framework Mode", badge: "FRAMEWORK", badgeColor: "amber" } ]} minWidth="160px" />
            <CustomDropdown value={filterCategory} onChange={setFilterCategory} options={[ { value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c._id, label: c.name, badgeColor: "gray" as const })) ]} minWidth="170px" />
            <CustomDropdown value={sortBy} onChange={setSortBy} options={[ { value: "newest", label: "Sort: Newest First" }, { value: "oldest", label: "Sort: Oldest First" }, { value: "a-z", label: "Sort: Title A-Z" }, { value: "z-a", label: "Sort: Title Z-A" } ]} minWidth="165px" />
            <button type="button" onClick={() => { setSearchTerm(""); setFilterType("all"); setFilterCategory("all"); setSortBy("newest"); }} style={{ padding: "9px 14px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.22)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Reset</button>
          </div>

          {/* ⚡ GRID AREA */}
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>Loading collections...</div>
          ) : filteredSeries.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", backgroundColor: "#111827", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ color: "#9ca3af", margin: 0 }}>No collections found.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
              {filteredSeries.map((s) => {
                const isDetailOpen = activeDetailId === s._id;
                const isFramework = s.type === "framework";
                const catName = typeof s.category === "object" ? s.category?.name : "Uncategorized";
                const subName = typeof s.subCategory === "object" ? s.subCategory?.name : "";
                const tierLabel = s.for === 3 ? "PRO" : s.for === 2 ? "STD" : s.for === 1 ? "BASIC" : "FREE";

                return (
                  <div key={s._id} style={{ position: "relative", backgroundColor: "#111827", borderRadius: "12px", border: isDetailOpen ? "1px solid rgba(0, 210, 180, 0.45)" : "1px solid rgba(255,255,255,0.08)", overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color 0.15s ease", height: "100%" }}>
                    
                    {/* Top Right Detail Button */}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setActiveDetailId(isDetailOpen ? null : s._id); }} style={{ position: "absolute", top: "12px", right: "12px", width: "28px", height: "28px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.2)", backgroundColor: isDetailOpen ? "rgba(0, 210, 180, 0.25)" : "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", color: isDetailOpen ? "#00D2B4" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
                      <Icons.Info />
                    </button>

                    {/* ⚡ PERFECT EXPANDED POPOVER */}
                    {isDetailOpen && (
                      <div ref={detailPopoverRef} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "46px", right: "12px", left: "12px", backgroundColor: "#161f33", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "10px", padding: "16px", boxShadow: "0 18px 40px rgba(0,0,0,0.85)", zIndex: 50 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                          <div><div style={{ fontSize: "11px", color: "#00D2B4", fontWeight: 700, textTransform: "uppercase" }}>Full Details</div><h4 style={{ margin: "2px 0 0", fontSize: "14px", color: "#fff", fontWeight: 600 }}>{s.title}</h4></div>
                          <button type="button" onClick={() => setActiveDetailId(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#9ca3af", width: "24px", height: "24px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Icons.Close /></button>
                        </div>
                        <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#d1d5db", lineHeight: "1.5", maxHeight: "80px", overflowY: "auto" }}>{s.description}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", padding: "10px", borderRadius: "8px", backgroundColor: "#0b0f19", border: "1px solid rgba(255,255,255,0.06)", fontSize: "11px" }}>
                          <div><span style={{ color: "#6b7280", display: "block" }}>Author</span><strong style={{ color: "#e5e7eb" }}>{s.author || "Unknown"}</strong></div>
                          <div><span style={{ color: "#6b7280", display: "block" }}>Tier</span><strong style={{ color: tierLabel === "FREE" ? "#9ca3af" : "#00D2B4" }}>{tierLabel}</strong></div>
                          <div style={{ gridColumn: "span 2" }}><span style={{ color: "#6b7280", display: "block" }}>Category Path</span><strong style={{ color: "#e5e7eb" }}>{catName} {subName ? `› ${subName}` : ""}</strong></div>
                          <div><span style={{ color: "#6b7280", display: "block" }}>Chapters Attached</span><strong style={{ color: "#e5e7eb" }}>{s.chapters?.length || 0}</strong></div>
                          <div><span style={{ color: "#6b7280", display: "block" }}>Created On</span><strong style={{ color: "#e5e7eb" }}>{formatDateTime(s.createdAt)}</strong></div>
                          {isFramework && (
                            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#6b7280", display: "block" }}>Recommended Book</span><strong style={{ color: "#00D2B4" }}>{s.recommendationBookId ? "Attached" : "None"}</strong></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ⚡ PERFECT 16:9 ABSOLUTE LOCK HACK FOR IMAGES */}
                    <div style={{ width: "100%", paddingTop: "56.25%", position: "relative", backgroundColor: "#161d2d", flexShrink: 0 }}>
                      <img src={s.cover} alt={s.title} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600"; }} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", bottom: "8px", left: "8px", display: "flex", gap: "6px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px", backgroundColor: isFramework ? "rgba(245, 158, 11, 0.85)" : "rgba(168, 85, 247, 0.85)", color: "#fff", backdropFilter: "blur(4px)" }}>
                          {isFramework ? "FRAMEWORK" : "SERIES"}
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", backgroundColor: s.for === 3 ? "rgba(239, 68, 68, 0.85)" : s.for === 2 ? "rgba(245, 158, 11, 0.85)" : s.for === 1 ? "rgba(59, 130, 246, 0.85)" : "rgba(255,255,255,0.2)", color: s.for === 3 || s.for === 2 || s.for === 1 ? "#fff" : "#e5e7eb", backdropFilter: "blur(4px)" }}>
                          {tierLabel}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 700, color: "#fff", lineHeight: "1.3", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.title}</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap", fontSize: "12px", color: "#9ca3af" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Icons.User /> {s.author || "Unknown"}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Icons.Folder /> {catName}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Icons.Calendar /> {formatDateTime(s.createdAt)?.split(',')[0]}</span>
                        </div>
                      </div>

                      {/* ⚡ HIDE EDIT/DELETE BUTTONS IF NOT canEdit */}
                      {canEdit && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                          <button onClick={() => openChapterManager(s)} style={{ ...actionBtnStyle, backgroundColor: "rgba(0, 210, 180, 0.1)", color: "#00D2B4", border: "1px solid rgba(0, 210, 180, 0.25)" }}>
                            Manage {s.chapters?.length || 0} Chapters (Sort)
                          </button>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => openEditModal(s)} style={actionBtnStyle}>Edit Info</button>
                            <button onClick={() => handleDelete(s._id, s.title)} style={{ ...actionBtnStyle, flex: "0 0 auto", backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ⚡ SMOOTH SPOTIFY-STYLE QUEUE MODAL (CHAPTER DRAG & DROP) */}
          {managingSeries && (
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
              <div style={{ backgroundColor: "#111827", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "640px", maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 50px rgba(0,0,0,0.7)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <h2 style={{ fontSize: "19px", fontWeight: 700, margin: 0, color: "#fff" }}>Chapter Queue: <span style={{ color: "#00D2B4" }}>{managingSeries.title}</span></h2>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9ca3af" }}>Hold the grip icon to smoothly drag and reorder your playlist.</p>
                  </div>
                  <button type="button" onClick={() => setManagingSeries(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#9ca3af", width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icons.Close /></button>
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <CustomDropdown 
                    value={chapterToAdd} 
                    onChange={setChapterToAdd} 
                    placeholder="Search to add next chapter..." 
                    options={[{ value: "", label: "-- Select Chapter --" }, ...allChapters.filter(c => !assignedChapters.some(a => String(a._id) === String(c._id))).map(c => ({ value: c._id, label: c.title, badge: c.type === "audio" ? "AUDIO" : "PDF", badgeColor: c.type === "audio" ? "amber" : "teal" }))]} 
                  />
                  <button onClick={handleAddChapterToSeries} disabled={!chapterToAdd} style={{ padding: "0 18px", backgroundColor: chapterToAdd ? "rgba(0, 210, 180, 0.15)" : "rgba(255,255,255,0.05)", color: chapterToAdd ? "#00D2B4" : "#6b7280", border: chapterToAdd ? "1px solid rgba(0, 210, 180, 0.3)" : "1px solid transparent", borderRadius: "8px", fontWeight: 600, cursor: chapterToAdd ? "pointer" : "not-allowed" }}>
                    Add to Queue
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" }}>
                  {assignedChapters.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "50px 20px", color: "#6b7280", backgroundColor: "#0b0f19", borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                      Queue is empty. Add chapters from above.
                    </div>
                  ) : (
                    assignedChapters.map((ch, idx) => (
                      <div 
                        key={ch._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnter={(e) => handleDragEnter(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        style={{
                          display: "flex", alignItems: "center", gap: "14px", padding: "10px 14px", borderRadius: "10px",
                          backgroundColor: draggingIdx === idx ? "rgba(255,255,255,0.02)" : "#0b0f19",
                          border: draggingIdx === idx ? "1px solid rgba(0, 210, 180, 0.4)" : "1px solid rgba(255,255,255,0.04)",
                          boxShadow: draggingIdx === idx ? "0 10px 20px rgba(0,0,0,0.5)" : "none",
                          opacity: draggingIdx === idx ? 0.7 : 1,
                          transform: draggingIdx === idx ? "scale(1.02)" : "scale(1)",
                          transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1), background-color 0.2s ease, box-shadow 0.2s ease",
                        }}
                      >
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#6b7280", width: "20px", textAlign: "center" }}>{idx + 1}</div>
                        <img src={ch.cover} alt="" style={{ width: "42px", height: "42px", borderRadius: "6px", objectFit: "cover" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.title}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                            {ch.type === "audio" ? <Icons.MusicIcon /> : <Icons.DocIcon />}
                            <span style={{ fontSize: "11px", color: "#9ca3af" }}>{ch.type === "audio" ? "Audio Book" : "Document"}</span>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveChapterFromSeries(ch._id)} style={{ background: "none", border: "none", color: "#ef4444", padding: "8px", cursor: "pointer", opacity: 0.8 }} title="Remove"><Icons.Close /></button>
                        
                        <div style={{ padding: "8px 0 8px 8px", color: "#9ca3af", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center" }} title="Drag to reorder">
                          <Icons.Grip />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <button type="button" onClick={() => setManagingSeries(null)} style={{ padding: "10px 18px", backgroundColor: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
                  <button type="button" onClick={handleSaveChapterOrder} disabled={savingChapters} style={{ padding: "10px 24px", backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: savingChapters ? "not-allowed" : "pointer", fontSize: "13px" }}>
                    {savingChapters ? "Saving Queue..." : "Save Custom Order"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN CREATE / EDIT MODAL FORM */}
          {showModal && (
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
              <div style={{ backgroundColor: "#161d2d", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "780px", maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "19px", fontWeight: 700, margin: 0, color: "#fff" }}>
                    {editingId ? "Edit Collection" : "Create New Collection"}
                  </h2>
                  <button type="button" onClick={() => setShowModal(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#9ca3af", width: "30px", height: "30px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icons.Close /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  
                  <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "8px" }}>
                    <button type="button" onClick={() => setFormType("normal")} style={{ background: "none", border: "none", padding: "10px 16px", color: formType === "normal" ? "#c084fc" : "#9ca3af", borderBottom: formType === "normal" ? "2px solid #c084fc" : "none", fontWeight: formType === "normal" ? 700 : 500, cursor: "pointer", fontSize: "14px", transition: "all 0.2s" }}>
                      Normal Series Mode
                    </button>
                    <button type="button" onClick={() => setFormType("framework")} style={{ background: "none", border: "none", padding: "10px 16px", color: formType === "framework" ? "#f59e0b" : "#9ca3af", borderBottom: formType === "framework" ? "2px solid #f59e0b" : "none", fontWeight: formType === "framework" ? 700 : 500, cursor: "pointer", fontSize: "14px", transition: "all 0.2s" }}>
                      Framework Mode (Advanced)
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div><label style={labelStyle}>Title *</label><input type="text" required placeholder="e.g. JavaScript Basics" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Author / Creator *</label><input type="text" required placeholder="e.g. John Doe" value={formAuthor} onChange={(e) => setFormAuthor(e.target.value)} style={inputStyle} /></div>
                  </div>

                  <div>
                    <label style={labelStyle}>Cover Image URL (16:9 Format Recommended) *</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="text" required placeholder="https://..." value={formCover} onChange={(e) => setFormCover(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                      <label style={{ ...uploadBtnStyle, backgroundColor: uploadingCover ? "rgba(255,255,255,0.1)" : "rgba(255, 255, 255, 0.08)", color: uploadingCover ? "#9ca3af" : "#fff" }}>
                        <Icons.Upload /> {uploadingCover ? (uploadProgress !== null ? `${uploadProgress}%` : "...") : "Upload"}
                        <input type="file" accept="image/*" disabled={uploadingCover} onChange={handleFileUpload} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>

                  <div><label style={labelStyle}>Description *</label><textarea rows={2} required placeholder="Series summary..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} style={inputStyle} /></div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                    <div><label style={labelStyle}>Category *</label><CustomDropdown value={formCategory} onChange={(val) => { setFormCategory(val); setFormSubCategory(""); }} placeholder="Select Category" options={categories.map((c) => ({ value: c._id, label: c.name }))} /></div>
                    <div><label style={labelStyle}>Sub-Category</label><CustomDropdown value={formSubCategory} onChange={setFormSubCategory} placeholder="-- None --" options={[{ value: "", label: "None" }, ...availableSubCategories.map((sub) => ({ value: sub._id, label: sub.name }))]} /></div>
                    <div><label style={labelStyle}>Subscription Tier</label><CustomDropdown value={String(formPlan)} onChange={(val) => setFormPlan(Number(val))} options={[ { value: "0", label: "Free (0)", badge: "FREE", badgeColor: "gray" }, { value: "1", label: "Basic (1)", badge: "BASIC", badgeColor: "blue" }, { value: "2", label: "Standard (2)", badge: "STD", badgeColor: "amber" }, { value: "3", label: "Pro (3)", badge: "PRO", badgeColor: "purple" } ]} /></div>
                  </div>

                  {formType === "framework" && (
                    <div style={{ padding: "16px", backgroundColor: "rgba(245, 158, 11, 0.04)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "4px" }}>
                      <div style={{ gridColumn: "span 2", marginBottom: "-6px" }}>
                        <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>Framework Recommendation Extra</span>
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={labelStyle}>Assign Recommendation Book (Chapter)</label>
                        <CustomDropdown value={formRecommendationId} onChange={setFormRecommendationId} placeholder="Select a chapter..." options={[ { value: "", label: "-- No Recommendation --" }, ...allChapters.map(c => ({ value: c._id, label: c.title, badge: c.type === "audio" ? "AUDIO" : "PDF", badgeColor: c.type === "audio" ? "amber" : "teal" })) ]} />
                      </div>
                      {formRecommendationId && (
                        <div style={{ gridColumn: "span 2" }}>
                          <label style={labelStyle}>Recommendation Pitch / Text</label>
                          <input type="text" placeholder="Why should users read this book?" value={formRecommendationText} onChange={(e) => setFormRecommendationText(e.target.value)} style={inputStyle} />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 18px", backgroundColor: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
                    <button type="submit" disabled={submitting || uploadingCover} style={{ padding: "10px 24px", backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: submitting || uploadingCover ? "not-allowed" : "pointer", fontSize: "13px" }}>
                      {submitting ? "Saving..." : editingId ? "Update Collection" : "Create Collection"}
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

// Styles
const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "6px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "#0b0f19", color: "#fff", outline: "none", boxSizing: "border-box", fontSize: "13px" };
const filterInputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "#0b0f19", color: "#fff", outline: "none", fontSize: "13px" };
const uploadBtnStyle: React.CSSProperties = { border: "1px solid rgba(0, 210, 180, 0.3)", padding: "9px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" };
const navBtnStyle: React.CSSProperties = { backgroundColor: "rgba(255, 255, 255, 0.06)", color: "#e5e7eb", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "8px", padding: "9px 15px", fontSize: "13px", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "7px" };
const actionBtnStyle: React.CSSProperties = { flex: 1, padding: "7px 12px", backgroundColor: "rgba(255,255,255,0.07)", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };