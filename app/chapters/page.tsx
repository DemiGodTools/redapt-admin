// File: app/chapters/page.tsx (Admin Chapter Management Hub)
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { uploadFileSmart } from "@/lib/clientUpload";

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
  isProtected?: boolean;
  category: any;
  subCategory?: any;
  series?: any;
  questions?: any[];
  toc?: ITocItem[];
  transcript?: string;
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

// Clean SVG Icon Pack
const Icons = {
  Search: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  ChevronDown: ({ open }: { open?: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>,
  ChevronRight: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
  Info: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
  Close: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Layers: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  FileText: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  Upload: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  Calendar: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  Shield: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Check: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00D2B4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
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
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

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
            <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", backgroundColor: badgePalette[selectedOption.badgeColor || "gray"].bg, color: badgePalette[selectedOption.badgeColor || "gray"].text, border: `1px solid ${badgePalette[selectedOption.badgeColor || "gray"].border}`, textTransform: "uppercase", flexShrink: 0 }}>
              {selectedOption.badge}
            </span>
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
            {visibleOptions.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", color: "#6b7280", fontSize: "12px" }}>No matching options</div>
            ) : (
              visibleOptions.map((opt, idx) => {
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
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChaptersAdminPage() {
  const [chapters, setChapters] = useState<IChapterItem[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ⚡ RBAC Check State
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
        if (access.chapters === "edit") {
          setCanEdit(true); // Team member with 'edit' access
        }
      } catch (e) {
        console.error("Failed to parse access data");
      }
    }
  }, []);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeries, setFilterSeries] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const detailPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (detailPopoverRef.current && !detailPopoverRef.current.contains(e.target as Node)) {
        setActiveDetailId(null);
      }
    };
    if (activeDetailId) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeDetailId]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Advanced Tab State for Audio
  const [modalTab, setModalTab] = useState<"toc" | "transcript">("toc");

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
  const [formSeries, setFormSeries] = useState("");
  const [formTrending, setFormTrending] = useState(false);
  const [formDownloadable, setFormDownloadable] = useState(true);
  const [formProtected, setFormProtected] = useState(true);
  const [formToc, setFormToc] = useState<ITocItem[]>([]);
  const [formTranscript, setFormTranscript] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chRes, catRes] = await Promise.all([ fetch("/api/admin/chapter"), fetch("/api/category") ]);
      const chData = await chRes.json().catch(() => null);
      const catData = await catRes.json().catch(() => null);
      if (chData?.success) {
        setChapters(chData.data || []);
        if (Array.isArray(chData.series)) setSeriesList(chData.series);
      }
      if (catData?.success) setCategories(catData.data || []);
    } catch (err) { console.error("Data load error:", err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const availableSubCategories = useMemo(() => {
    const parent = categories.find((c) => c._id === formCategory);
    return parent?.subCategories || [];
  }, [formCategory, categories]);

  const getCategoryPath = (ch: IChapterItem) => {
    const catId = typeof ch.category === "object" ? ch.category?._id : ch.category;
    const catObj = categories.find((c) => String(c._id) === String(catId));
    const catName = (typeof ch.category === "object" ? ch.category?.name : null) || catObj?.name || "Uncategorized";
    let subName = "";
    if (ch.subCategory) {
      const subId = typeof ch.subCategory === "object" ? ch.subCategory?._id : ch.subCategory;
      const subInCat = catObj?.subCategories?.find((s) => String(s._id) === String(subId));
      subName = (typeof ch.subCategory === "object" ? ch.subCategory?.name : null) || subInCat?.name || "";
    }
    return { catName, subName };
  };

  const getChapterSeries = (ch: IChapterItem): { id: string; name: string; order?: number; isFramework: boolean } | null => {
    for (const s of seriesList) {
      if (Array.isArray(s.chapters)) {
        const match = s.chapters.find((item: any) => {
          if (!item?.content) return false;
          const contentId = typeof item.content === "object" ? item.content._id : item.content;
          return String(contentId) === String(ch._id);
        });
        if (match) return { id: String(s._id), name: s.title || s.name || "Untitled Series", order: match.order, isFramework: String(s.type || "normal").toLowerCase() === "framework" };
      }
    }
    if (ch.series) {
      if (typeof ch.series === "object" && ch.series._id) {
        const foundInList = seriesList.find((s) => String(s._id) === String(ch.series._id));
        return { id: String(ch.series._id), name: ch.series.title || ch.series.name || foundInList?.title || "Linked Series", isFramework: String(ch.series.type || foundInList?.type || "normal").toLowerCase() === "framework" };
      }
      if (typeof ch.series === "string") {
        const foundInList = seriesList.find((s) => String(s._id) === String(ch.series));
        if (foundInList) return { id: String(foundInList._id), name: foundInList.title || "Linked Series", isFramework: String(foundInList.type || "normal").toLowerCase() === "framework" };
      }
    }
    return null;
  };

  const allSeriesOptions = useMemo(() => {
    const map = new Map<string, { title: string; isFramework: boolean }>();
    seriesList.forEach((s) => {
      if (s?._id) map.set(String(s._id), { title: s.title || s.name || "Untitled", isFramework: String(s.type || "normal").toLowerCase() === "framework" });
    });
    chapters.forEach((ch) => {
      if (ch.series && typeof ch.series === "object" && ch.series._id) {
        const id = String(ch.series._id);
        if (!map.has(id)) map.set(id, { title: ch.series.title || ch.series.name || "Untitled", isFramework: String(ch.series.type || "normal").toLowerCase() === "framework" });
      }
    });
    return Array.from(map.entries()).map(([id, info]) => ({ _id: id, title: info.title, isFramework: info.isFramework }));
  }, [seriesList, chapters]);

  const formSeriesDropdownOptions: IDropdownOption[] = useMemo(
    () => [
      { value: "", label: "Standalone (Not in any Series)", badge: "SINGLE", badgeColor: "gray" },
      ...allSeriesOptions.map((s) => ({
        value: s._id,
        label: s.title,
        badge: s.isFramework ? "FRAMEWORK" : "SERIES",
        badgeColor: s.isFramework ? "amber" : "purple",
        group: "Assign to Series",
      })),
    ],
    [allSeriesOptions]
  );

  const resetForm = () => {
    setEditingId(null); setFormTitle(""); setFormDetails(""); setFormMedia(""); setFormCover(""); setFormAuthor("");
    setFormType("pdf"); setFormPlan(0); setFormCategory(categories[0]?._id || ""); setFormSubCategory(""); setFormSeries("");
    setFormTrending(false); setFormDownloadable(true); setFormProtected(true); setFormToc([]); setFormTranscript("");
    setModalTab("toc"); setUploadingPdf(false); setUploadingCover(false);
  };

  const openCreateModal = () => { resetForm(); setShowModal(true); };

  const openEditModal = (ch: IChapterItem) => {
    const seriesInfo = getChapterSeries(ch);
    setEditingId(ch._id); setFormTitle(ch.title || ""); setFormDetails(ch.details || ""); setFormMedia(ch.media || "");
    setFormCover(ch.cover || ""); setFormAuthor(ch.author || ""); setFormType(ch.type || "pdf"); setFormPlan(ch.for ?? 0);
    setFormCategory(typeof ch.category === "object" ? ch.category?._id : ch.category || "");
    setFormSubCategory(typeof ch.subCategory === "object" ? ch.subCategory?._id : ch.subCategory || "");
    setFormSeries(seriesInfo?.id || ""); setFormTrending(Boolean(ch.isTrending));
    setFormDownloadable(ch.isDownloadable ?? true); setFormProtected(ch.isProtected !== undefined ? Boolean(ch.isProtected) : true);
    setFormToc(Array.isArray(ch.toc) ? ch.toc : []); setFormTranscript(ch.transcript || "");
    setModalTab("toc"); setActiveDetailId(null); setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "media" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === "media") setUploadingPdf(true);
    if (type === "cover") setUploadingCover(true);
    setUploadProgress(0);
    try {
      const url = await uploadFileSmart(file, type === "media" ? "media" : "covers", (pct) => {
        setUploadProgress(pct);
      });
      if (type === "media") {
        setFormMedia(url);
        alert(`Media uploaded to Backblaze B2 successfully!`);
      } else {
        setFormCover(url);
        alert(`Cover uploaded to Backblaze B2 successfully!`);
      }
    } catch (err: any) {
      alert(err?.message || "Error uploading file");
    } finally {
      if (type === "media") setUploadingPdf(false);
      if (type === "cover") setUploadingCover(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  const handleTranscriptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTranscript(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFormTranscript(text);
      setUploadingTranscript(false);
      alert("Transcript loaded successfully!");
    };
    reader.onerror = () => {
      setUploadingTranscript(false);
      alert("Error reading the file.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const addTocRow = () => setFormToc((prev) => [...prev, { cut: "", title: "" }]);
  const updateTocRow = (index: number, key: "cut" | "title", val: string) => {
    setFormToc((prev) => { const copy = [...prev]; copy[index][key] = val; return copy; });
  };
  const removeTocRow = (index: number) => setFormToc((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMedia.trim() || !formCover.trim() || !formAuthor.trim() || !formCategory) { alert("Please fill all required fields."); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(), details: formDetails.trim(), media: formMedia.trim(), cover: formCover.trim(), author: formAuthor.trim(), type: formType,
        for: Number(formPlan), category: formCategory, subCategory: formSubCategory || null, series: formSeries || null, isTrending: formTrending,
        isDownloadable: formDownloadable, isProtected: formProtected, toc: formToc.filter((t) => t.title.trim() && t.cut.trim()),
        transcript: formType === "audio" ? formTranscript.trim() : "",
      };
      const url = editingId ? `/api/admin/chapter?id=${editingId}` : `/api/admin/chapter`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(() => null);
      if (resData?.success) { alert(editingId ? "Chapter updated!" : "Chapter created!"); setShowModal(false); fetchData(); }
      else { alert(resData?.message || "Operation failed."); }
    } catch (err) { alert("Server error"); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete chapter "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/chapter?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (data?.success) setChapters((prev) => prev.filter((c) => c._id !== id));
      else alert(data?.message || "Delete failed");
    } catch (err) { alert("Error deleting chapter"); }
  };

  const filteredChapters = useMemo(() => {
    let result = chapters;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => {
        const sInfo = getChapterSeries(c);
        const { catName, subName } = getCategoryPath(c);
        return (c.title?.toLowerCase().includes(term) || c.author?.toLowerCase().includes(term) || catName.toLowerCase().includes(term) || subName.toLowerCase().includes(term) || sInfo?.name?.toLowerCase().includes(term));
      });
    }
    if (filterPlan !== "all") result = result.filter((c) => c.for === Number(filterPlan));
    if (filterCategory !== "all") result = result.filter((c) => { const catId = typeof c.category === "object" ? c.category?._id : c.category; return String(catId) === String(filterCategory); });
    if (filterType !== "all") result = result.filter((c) => c.type === filterType);
    if (filterSeries !== "all") result = result.filter((c) => {
      const seriesInfo = getChapterSeries(c);
      if (filterSeries === "none") return !seriesInfo;
      if (filterSeries === "any") return Boolean(seriesInfo);
      if (filterSeries === "framework-only") return Boolean(seriesInfo?.isFramework);
      return String(seriesInfo?.id) === String(filterSeries);
    });
    result = [...result].sort((a, b) => {
      if (sortBy === "a-z") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "z-a") return (b.title || "").localeCompare(a.title || "");
      if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === "series-order") { const orderA = getChapterSeries(a)?.order ?? 9999; const orderB = getChapterSeries(b)?.order ?? 9999; return orderA - orderB; }
      return new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime();
    });
    return result;
  }, [chapters, searchTerm, filterPlan, filterCategory, filterType, filterSeries, sortBy, seriesList, categories]);

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
                Chapter Management Hub
              </h1>
              <p style={{ color: "#9ca3af", margin: "6px 0 0", fontSize: "13px" }}>
                Showing <strong style={{ color: "#fff" }}>{filteredChapters.length}</strong> of {chapters.length} chapters
              </p>
            </div>
            
            {/* ⚡ HIDE CREATE BUTTON IF NOT canEdit */}
            {canEdit && (
              <button onClick={openCreateModal} style={{ backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <Icons.Plus /> Create Chapter
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div style={{ marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "10px", backgroundColor: "#111827", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.07)", alignItems: "center" }}>
            <div style={{ flex: "1 1 240px", position: "relative", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: "12px", color: "#6b7280", pointerEvents: "none", display: "flex" }}><Icons.Search /></div>
              <input type="text" placeholder="Search title, author, category, series..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...filterInputStyle, paddingLeft: "36px" }} />
            </div>
            <CustomDropdown value={filterPlan} onChange={setFilterPlan} options={[{ value: "all", label: "All Plans" }, { value: "0", label: "Free Tier", badge: "0", badgeColor: "gray" }, { value: "1", label: "Basic Tier", badge: "1", badgeColor: "blue" }, { value: "2", label: "Standard Tier", badge: "2", badgeColor: "amber" }, { value: "3", label: "Pro Tier", badge: "3", badgeColor: "purple" }]} minWidth="140px" />
            <CustomDropdown value={filterCategory} onChange={setFilterCategory} options={[{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c._id, label: c.name, badgeColor: "gray" as const }))]} minWidth="165px" />
            <CustomDropdown value={filterSeries} onChange={setFilterSeries} options={[{ value: "all", label: `All Content (${chapters.length})` }, { value: "any", label: "In Any Series", badge: "LINKED", badgeColor: "purple" }, { value: "framework-only", label: "Framework Series Only", badge: "FRAMEWORK", badgeColor: "amber" }, { value: "none", label: "Standalone Chapters", badge: "SINGLE", badgeColor: "gray" }, ...allSeriesOptions.map((s) => ({ value: s._id, label: s.title, badge: s.isFramework ? "FRAMEWORK" : "SERIES", badgeColor: s.isFramework ? "amber" : "purple", group: "Available Series" }))]} minWidth="210px" />
            <CustomDropdown value={filterType} onChange={setFilterType} options={[{ value: "all", label: "All Media Types" }, { value: "pdf", label: "PDF Documents", badge: "PDF", badgeColor: "teal" }, { value: "audio", label: "Audio Books", badge: "AUDIO", badgeColor: "amber" }]} minWidth="150px" />
            <CustomDropdown value={sortBy} onChange={setSortBy} options={[{ value: "newest", label: "Sort: Newest First" }, { value: "oldest", label: "Sort: Oldest First" }, { value: "a-z", label: "Sort: Title A-Z" }, { value: "z-a", label: "Sort: Title Z-A" }, { value: "series-order", label: "Sort: Series Order (#)" }]} minWidth="165px" />
            <button type="button" onClick={() => { setSearchTerm(""); setFilterPlan("all"); setFilterCategory("all"); setFilterType("all"); setFilterSeries("all"); setSortBy("newest"); }} style={{ padding: "9px 14px", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.22)", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Reset</button>
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>Loading chapters...</div>
          ) : filteredChapters.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", backgroundColor: "#111827", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ color: "#9ca3af", margin: 0 }}>No chapters found.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(370px, 1fr))", gap: "18px" }}>
              {filteredChapters.map((ch) => {
                const seriesInfo = getChapterSeries(ch);
                const { catName, subName } = getCategoryPath(ch);
                const isDetailOpen = activeDetailId === ch._id;

                return (
                  <div key={ch._id} style={{ position: "relative", backgroundColor: "#111827", borderRadius: "12px", border: isDetailOpen ? "1px solid rgba(0, 210, 180, 0.45)" : "1px solid rgba(255,255,255,0.08)", padding: "16px", display: "flex", gap: "14px", transition: "border-color 0.15s ease" }}>
                    
                    <button type="button" onClick={(e) => { e.stopPropagation(); setActiveDetailId(isDetailOpen ? null : ch._id); }} style={{ position: "absolute", top: "12px", right: "12px", width: "28px", height: "28px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: isDetailOpen ? "rgba(0, 210, 180, 0.15)" : "rgba(255,255,255,0.04)", color: isDetailOpen ? "#00D2B4" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2 }}>
                      <Icons.Info />
                    </button>

                    {/* Popover */}
                    {isDetailOpen && (
                      <div ref={detailPopoverRef} onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "46px", right: "12px", left: "12px", backgroundColor: "#161f33", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "10px", padding: "16px", boxShadow: "0 18px 40px rgba(0,0,0,0.85)", zIndex: 50 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                          <div><div style={{ fontSize: "11px", color: "#00D2B4", fontWeight: 700, textTransform: "uppercase" }}>Chapter Specifications</div><h4 style={{ margin: "2px 0 0", fontSize: "14px", color: "#fff", fontWeight: 600 }}>{ch.title}</h4></div>
                          <button type="button" onClick={() => setActiveDetailId(null)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#9ca3af", width: "24px", height: "24px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icons.Close /></button>
                        </div>
                        <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#d1d5db", lineHeight: "1.5", maxHeight: "90px", overflowY: "auto" }}>{ch.details}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", padding: "10px", borderRadius: "8px", backgroundColor: "#0b0f19", border: "1px solid rgba(255,255,255,0.06)", fontSize: "11px" }}>
                          <div><span style={{ color: "#6b7280", display: "block" }}>Category Path</span><strong style={{ color: "#e5e7eb" }}>{catName} {subName ? `› ${subName}` : ""}</strong></div>
                          <div><span style={{ color: "#6b7280", display: "block" }}>Series Assignment</span><strong style={{ color: seriesInfo ? "#c084fc" : "#9ca3af" }}>{seriesInfo ? `${seriesInfo.name} (${seriesInfo.isFramework ? "Framework" : "Series"}${seriesInfo.order ? ` #${seriesInfo.order}` : ""})` : "Standalone"}</strong></div>
                          <div style={{ gridColumn: "span 2" }}><span style={{ color: "#6b7280", display: "block" }}>Security & Stats</span><strong style={{ color: "#e5e7eb" }}>Q&A: {ch.questions?.length || 0} • TOC: {ch.toc?.length || 0} • DRM: {ch.isProtected !== false ? "On" : "Off"}</strong></div>
                        </div>
                      </div>
                    )}

                    <img src={ch.cover} alt={ch.title} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300"; }} style={{ width: "84px", height: "122px", objectFit: "cover", borderRadius: "8px", backgroundColor: "#161d2d", flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ paddingRight: "32px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px", backgroundColor: ch.type === "audio" ? "rgba(245, 158, 11, 0.15)" : "rgba(0, 210, 180, 0.15)", color: ch.type === "audio" ? "#f59e0b" : "#00D2B4" }}>{ch.type || "pdf"}</span>
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", backgroundColor: ch.for === 3 ? "rgba(239, 68, 68, 0.15)" : ch.for === 2 ? "rgba(245, 158, 11, 0.15)" : ch.for === 1 ? "rgba(59, 130, 246, 0.15)" : "rgba(255,255,255,0.06)", color: ch.for === 3 ? "#ef4444" : ch.for === 2 ? "#f59e0b" : ch.for === 1 ? "#3b82f6" : "#9ca3af" }}>{ch.for === 3 ? "PRO" : ch.for === 2 ? "STD" : ch.for === 1 ? "BASIC" : "FREE"}</span>
                          {ch.isTrending && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(236, 72, 153, 0.15)", color: "#ec4899" }}>TRENDING</span>}
                        </div>

                        <h3 style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ch.title}</h3>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", fontSize: "11px", color: "#d1d5db" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: "4px" }}>{catName} {subName && <><Icons.ChevronRight /><span style={{ color: "#00D2B4", fontWeight: 600 }}>{subName}</span></>}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>
                          <Icons.Calendar /> {formatDateTime(ch.createdAt)}
                        </div>

                        {seriesInfo ? (
                          <div onClick={() => setFilterSeries(seriesInfo.id)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "3px 8px", borderRadius: "6px", backgroundColor: seriesInfo.isFramework ? "rgba(245, 158, 11, 0.12)" : "rgba(168, 85, 247, 0.12)", border: seriesInfo.isFramework ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(168, 85, 247, 0.3)", fontSize: "11px", color: seriesInfo.isFramework ? "#fbbf24" : "#c084fc", fontWeight: 600, cursor: "pointer", maxWidth: "100%" }}>
                            <Icons.Layers /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seriesInfo.name} {seriesInfo.order ? `(#${seriesInfo.order})` : ""}</span>
                          </div>
                        ) : (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "2px 8px", borderRadius: "6px", backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)", fontSize: "11px", color: "#6b7280" }}><Icons.FileText /> Standalone</div>
                        )}
                      </div>

                      {/* ⚡ HIDE EDIT/DELETE BUTTONS IF NOT canEdit */}
                      {canEdit && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                          <button onClick={() => openEditModal(ch)} style={actionBtnStyle}>Edit Chapter</button>
                          <button onClick={() => handleDelete(ch._id, ch.title)} style={{ ...actionBtnStyle, flex: "0 0 auto", backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
              <div style={{ backgroundColor: "#161d2d", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "780px", maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "19px", fontWeight: 700, margin: 0, color: "#fff" }}>{editingId ? "Edit Chapter" : "Create New Chapter"}</h2>
                  <button type="button" onClick={() => setShowModal(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#9ca3af", width: "30px", height: "30px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icons.Close /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div><label style={labelStyle}>Title *</label><input type="text" required placeholder="e.g. Marvel Chronicles" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Author / Creator *</label><input type="text" required placeholder="e.g. Stan Lee" value={formAuthor} onChange={(e) => setFormAuthor(e.target.value)} style={inputStyle} /></div>
                  </div>
                  <div><label style={labelStyle}>Details / Overview *</label><textarea rows={2} required placeholder="Chapter summary..." value={formDetails} onChange={(e) => setFormDetails(e.target.value)} style={inputStyle} /></div>
                  
                  <div>
                    <label style={labelStyle}>Media File (PDF / Audio) *</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="url" required placeholder="https://..." value={formMedia} onChange={(e) => setFormMedia(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                      <label style={{ ...uploadBtnStyle, backgroundColor: uploadingPdf ? "rgba(255,255,255,0.1)" : "rgba(0, 210, 180, 0.15)", color: uploadingPdf ? "#9ca3af" : "#00D2B4" }}>
                        <Icons.Upload /> {uploadingPdf ? (uploadProgress !== null ? `Uploading ${uploadProgress}%` : "Uploading...") : "Upload Media"}
                        <input type="file" accept="application/pdf,audio/*" disabled={uploadingPdf} onChange={(e) => handleFileUpload(e, "media")} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Cover Image URL *</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="url" required placeholder="https://images.unsplash.com/... or upload" value={formCover} onChange={(e) => setFormCover(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                      <label style={{ ...uploadBtnStyle, backgroundColor: uploadingCover ? "rgba(255,255,255,0.1)" : "rgba(255, 255, 255, 0.08)", color: uploadingCover ? "#9ca3af" : "#fff" }}>
                        <Icons.Upload /> {uploadingCover ? (uploadProgress !== null ? `Uploading ${uploadProgress}%` : "Upload Cover") : "Upload Cover"}
                        <input type="file" accept="image/*" disabled={uploadingCover} onChange={(e) => handleFileUpload(e, "cover")} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "14px" }}>
                    <div><label style={labelStyle}>Category *</label><CustomDropdown value={formCategory} onChange={(val) => { setFormCategory(val); setFormSubCategory(""); }} placeholder="Select Category" options={categories.map((c) => ({ value: c._id, label: c.name }))} /></div>
                    <div><label style={labelStyle}>Sub-Category</label><CustomDropdown value={formSubCategory} onChange={setFormSubCategory} placeholder="None" options={[{ value: "", label: "None" }, ...availableSubCategories.map((sub) => ({ value: sub._id, label: sub.name }))]} /></div>
                    <div><label style={{ ...labelStyle, color: "#c084fc" }}>Assign to Series</label><CustomDropdown value={formSeries} onChange={setFormSeries} placeholder="Standalone" options={formSeriesDropdownOptions} /></div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.4fr", gap: "12px", alignItems: "center" }}>
                    <div>
                      <label style={labelStyle}>Media Type</label>
                      <CustomDropdown value={formType} onChange={(val) => { setFormType(val as "pdf" | "audio"); if (val === "pdf") setModalTab("toc"); }} options={[{ value: "pdf", label: "PDF", badge: "PDF", badgeColor: "teal" }, { value: "audio", label: "Audio", badge: "AUDIO", badgeColor: "amber" }]} />
                    </div>
                    <div><label style={labelStyle}>Plan Tier</label><CustomDropdown value={String(formPlan)} onChange={(val) => setFormPlan(Number(val))} options={[{ value: "0", label: "Free" }, { value: "1", label: "Basic" }, { value: "2", label: "Std" }, { value: "3", label: "Pro" }]} /></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><input type="checkbox" id="trendingBox" checked={formTrending} onChange={(e) => setFormTrending(e.target.checked)} style={{ accentColor: "#ec4899", width: "14px", height: "14px", cursor: "pointer" }} /><label htmlFor="trendingBox" style={{ fontSize: "12px", color: "#fff", cursor: "pointer" }}>Mark Trending</label></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><input type="checkbox" id="downloadBox" checked={formDownloadable} onChange={(e) => setFormDownloadable(e.target.checked)} style={{ accentColor: "#00D2B4", width: "14px", height: "14px", cursor: "pointer" }} /><label htmlFor="downloadBox" style={{ fontSize: "12px", color: "#fff", cursor: "pointer" }}>Offline Save</label></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", backgroundColor: "rgba(239, 68, 68, 0.08)", padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.22)" }}>
                      <input type="checkbox" id="protectBox" checked={formProtected} onChange={(e) => setFormProtected(e.target.checked)} style={{ accentColor: "#ef4444", width: "16px", height: "16px", cursor: "pointer" }} />
                      <label htmlFor="protectBox" style={{ fontSize: "12px", color: "#ef4444", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}><Icons.Shield /> Block Screenshots</label>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px", marginTop: "8px" }}>
                    
                    <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                      <button type="button" onClick={() => setModalTab("toc")} style={{ background: "none", border: "none", padding: "8px 16px", color: modalTab === "toc" ? "#00D2B4" : "#9ca3af", borderBottom: modalTab === "toc" ? "2px solid #00D2B4" : "none", fontWeight: modalTab === "toc" ? 700 : 500, cursor: "pointer", fontSize: "13px" }}>
                        {formType === "audio" ? "Audio Timestamps" : "Table of Contents"}
                      </button>
                      {formType === "audio" && (
                        <button type="button" onClick={() => setModalTab("transcript")} style={{ background: "none", border: "none", padding: "8px 16px", color: modalTab === "transcript" ? "#f59e0b" : "#9ca3af", borderBottom: modalTab === "transcript" ? "2px solid #f59e0b" : "none", fontWeight: modalTab === "transcript" ? 700 : 500, cursor: "pointer", fontSize: "13px" }}>
                          Full Transcript
                        </button>
                      )}
                    </div>

                    {modalTab === "toc" && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Map sections to {formType === "audio" ? "timestamps (MM:SS)" : "page numbers"}.</span>
                          <button type="button" onClick={addTocRow} style={{ background: "rgba(0, 210, 180, 0.12)", color: "#00D2B4", border: "1px solid rgba(0, 210, 180, 0.25)", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>+ Add Entry</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "170px", overflowY: "auto" }}>
                          {formToc.length === 0 && <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", padding: "10px" }}>No entries mapped yet.</div>}
                          {formToc.map((tocItem, idx) => (
                            <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                              <input type="text" placeholder={formType === "audio" ? "Time (e.g. 02:15)" : "Page (e.g. 1)"} value={tocItem.cut} onChange={(e) => updateTocRow(idx, "cut", e.target.value)} style={{ ...inputStyle, width: "135px" }} />
                              <input type="text" placeholder="Section title" value={tocItem.title} onChange={(e) => updateTocRow(idx, "title", e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                              <button type="button" onClick={() => removeTocRow(idx)} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "none", borderRadius: "6px", width: "32px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icons.Close /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {modalTab === "transcript" && formType === "audio" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Paste manually or auto-extract from file.</span>
                          <label style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "6px", padding: "5px 10px", fontSize: "12px", cursor: uploadingTranscript ? "not-allowed" : "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                            <Icons.Upload /> {uploadingTranscript ? "Reading..." : "Auto Extract (TXT/VTT)"}
                            <input type="file" accept=".txt,.vtt" disabled={uploadingTranscript} onChange={handleTranscriptUpload} style={{ display: "none" }} />
                          </label>
                        </div>
                        <textarea
                          rows={6}
                          placeholder="[00:00.00] Enter synced lyrics or plain text here..."
                          value={formTranscript}
                          onChange={(e) => setFormTranscript(e.target.value)}
                          style={{ ...inputStyle, fontFamily: "monospace", fontSize: "12px", lineHeight: "1.5" }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                    <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 18px", backgroundColor: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
                    <button type="submit" disabled={submitting || uploadingPdf || uploadingCover} style={{ padding: "10px 24px", backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: submitting || uploadingPdf || uploadingCover ? "not-allowed" : "pointer", fontSize: "13px" }}>
                      {submitting ? "Saving..." : editingId ? "Update Chapter" : "Create Chapter"}
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

// Sub-components styles
const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "6px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "#0b0f19", color: "#fff", outline: "none", boxSizing: "border-box", fontSize: "13px" };
const filterInputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "#0b0f19", color: "#fff", outline: "none", fontSize: "13px" };
const uploadBtnStyle: React.CSSProperties = { border: "1px solid rgba(0, 210, 180, 0.3)", padding: "9px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" };
const actionBtnStyle: React.CSSProperties = { flex: 1, padding: "7px 12px", backgroundColor: "rgba(255,255,255,0.07)", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };