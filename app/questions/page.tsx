// File: app/questions/page.tsx (Admin Question & Quiz Hub)
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import AdminSidebar from "@/components/AdminSidebar";

interface IQuestionItem {
  _id: string;
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
  createdAt?: string;
}

interface IChapterItem {
  _id: string;
  title: string;
  type: string;
  cover?: string;
  questions?: any[];
  category?: any;
  subCategory?: any;
  series?: any;
}

interface IDropdownOption {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
}

// Clean SVG Icon Pack
const Icons = {
  Search: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  ChevronDown: ({ open }: { open?: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>,
  Close: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Check: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00D2B4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  Calendar: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
};

const badgePalette: Record<string, { bg: string; text: string; border: string }> = {
  purple: { bg: "rgba(168, 85, 247, 0.14)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
  amber: { bg: "rgba(245, 158, 11, 0.14)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
  teal: { bg: "rgba(0, 210, 180, 0.14)", text: "#00D2B4", border: "rgba(0, 210, 180, 0.3)" },
  gray: { bg: "rgba(255, 255, 255, 0.06)", text: "#9ca3af", border: "rgba(255, 255, 255, 0.12)" },
};

// Formatting Helper
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

function CustomDropdown({ value, onChange, options, placeholder = "Select..." }: { value: string; onChange: (val: string) => void; options: IDropdownOption[]; placeholder?: string; }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: open ? "1px solid rgba(0, 210, 180, 0.5)" : "1px solid rgba(255,255,255,0.12)", backgroundColor: "#0b0f19", color: selectedOption ? "#f3f4f6" : "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: 1 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <Icons.ChevronDown open={open} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, minWidth: "100%", backgroundColor: "#141c2b", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.9)", zIndex: 99999, overflow: "hidden", maxHeight: "240px", overflowY: "auto", padding: "4px" }}>
          {options.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button key={`${opt.value}-${idx}`} type="button" onClick={() => { onChange(opt.value); setOpen(false); }} style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "none", backgroundColor: isSelected ? "rgba(0, 210, 180, 0.12)" : "transparent", color: isSelected ? "#00D2B4" : "#e5e7eb", fontSize: "12px", fontWeight: isSelected ? 600 : 400, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
                {isSelected && <Icons.Check />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function QuestionsAdminPage() {
  const [activeTab, setActiveTab] = useState<"questions" | "link">("questions");

  const [questions, setQuestions] = useState<IQuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [chapters, setChapters] = useState<IChapterItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);

  // ⚡ RBAC Check State for Questions (qna)
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    // ⚡ Fetch role & permissions for 'qna' module
    const role = localStorage.getItem("adminRole");
    const accessData = localStorage.getItem("adminAccess");
    
    if (role === "master_admin") {
      setCanEdit(true);
    } else if (accessData) {
      try {
        const access = JSON.parse(accessData);
        if (access.qna === "edit") {
          setCanEdit(true);
        }
      } catch (e) {
        console.error("Failed to parse access data");
      }
    }
  }, []);

  // Assign Chapter Filters
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [assignedQuestionIds, setAssignedQuestionIds] = useState<string[]>([]);
  const [savingChapter, setSavingChapter] = useState(false);
  
  const [chapterSearch, setChapterSearch] = useState("");
  const [chapterType, setChapterType] = useState("all");
  const [chapterCat, setChapterCat] = useState("all");
  const [chapterSubCat, setChapterSubCat] = useState("all");
  const [chapterSeries, setChapterSeries] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["", "", "", ""]);
  const [formCorrect, setFormCorrect] = useState(0);
  const [formExplanation, setFormExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoadingQuestions(true);
      try {
        const [qRes, chRes, catRes, serRes] = await Promise.all([
          fetch("/api/admin/question").catch(()=>null),
          fetch("/api/admin/chapter").catch(()=>null),
          fetch("/api/category").catch(()=>null),
          fetch("/api/admin/series").catch(()=>null),
        ]);
        const qData = await qRes?.json().catch(()=>null);
        const chData = await chRes?.json().catch(()=>null);
        const catData = await catRes?.json().catch(()=>null);
        const serData = await serRes?.json().catch(()=>null);

        if (qData?.success) setQuestions(qData.data || []);
        if (chData?.success) setChapters(chData.data || []);
        if (catData?.success) setCategories(catData.data || []);
        if (serData?.success) setSeriesList(serData.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchAllData();
  }, []);

  const handleSelectChapter = (chId: string) => {
    setSelectedChapterId(chId);
    const target = chapters.find((c) => c._id === chId);
    if (target) {
      const qIds = (target.questions || []).map((q: any) => typeof q === "string" ? q : q._id);
      setAssignedQuestionIds(qIds);
    } else {
      setAssignedQuestionIds([]);
    }
  };

  const openCreateModal = () => {
    setEditingQuestionId(null);
    setFormQuestion("");
    setFormOptions(["", "", "", ""]);
    setFormCorrect(0);
    setFormExplanation("");
    setShowModal(true);
  };

  const openEditModal = (q: IQuestionItem) => {
    setEditingQuestionId(q._id);
    setFormQuestion(q.question);
    setFormOptions(q.options && q.options.length === 4 ? [...q.options] : [q.options[0] || "", q.options[1] || "", q.options[2] || "", q.options[3] || ""]);
    setFormCorrect(typeof q.correct === "number" ? q.correct : 0);
    setFormExplanation(q.explanation || "");
    setShowModal(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/question?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        setQuestions((prev) => prev.filter((q) => q._id !== id));
      } else {
        alert(data?.message || "Delete failed");
      }
    } catch (e: any) {
      alert(e.message || "Delete error");
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { question: formQuestion.trim(), options: formOptions.map((o) => o.trim()), correct: Number(formCorrect), explanation: formExplanation.trim() };
      const url = editingQuestionId ? `/api/admin/question?id=${editingQuestionId}` : `/api/admin/question`;
      const method = editingQuestionId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const resData = await res.json().catch(() => null);

      if (resData?.success) {
        setShowModal(false);
        const qRes = await fetch("/api/admin/question");
        const qData = await qRes.json();
        setQuestions(qData.data || []);
      } else {
        alert(resData?.message || "Failed to save question");
      }
    } catch (err) {
      alert("Error saving question");
    } finally { setSubmitting(false); }
  };

  const handleSaveToChapter = async () => {
    if (!selectedChapterId) return;
    setSavingChapter(true);
    try {
      const res = await fetch(`/api/admin/chapter?id=${selectedChapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedChapterId, questions: assignedQuestionIds }),
      });
      if (res.ok) alert("Questions successfully linked to Chapter!");
    } catch (e) {
      alert("Failed to save mapping");
    } finally { setSavingChapter(false); }
  };

  const filteredQuestions = useMemo(() => questions.filter((q) => q.question.toLowerCase().includes(searchTerm.toLowerCase())), [questions, searchTerm]);

  // Derived filter options for chapters
  const availableSubCats = useMemo(() => {
    const parent = categories.find((c) => String(c._id) === chapterCat);
    return parent?.subCategories || [];
  }, [chapterCat, categories]);

  // ⚡ 100% Accurate Cross-Check Sorting Logic ⚡
  const filteredChapters = useMemo(() => {
    let res = chapters;
    
    if (chapterSearch.trim()) res = res.filter(c => c.title.toLowerCase().includes(chapterSearch.toLowerCase()));
    
    if (chapterType !== "all") res = res.filter(c => (c.type || "pdf") === chapterType);
    
    if (chapterCat !== "all") res = res.filter(c => String(typeof c.category === "object" ? c.category?._id : c.category) === chapterCat);
    
    if (chapterSubCat !== "all") res = res.filter(c => String(typeof c.subCategory === "object" ? c.subCategory?._id : c.subCategory) === chapterSubCat);
    
    // ⚡ Robust Series Filter
    if (chapterSeries !== "all") {
      res = res.filter(c => {
        const cSeriesId = typeof c.series === "object" ? c.series?._id : c.series;
        if (String(cSeriesId) === String(chapterSeries)) return true;
        
        const selectedSeries = seriesList.find(s => String(s._id) === String(chapterSeries));
        if (selectedSeries && Array.isArray(selectedSeries.chapters)) {
          return selectedSeries.chapters.some((item: any) => {
            const contentId = typeof item.content === "object" ? item.content?._id : item.content;
            return String(contentId) === String(c._id);
          });
        }
        return false;
      });
    }

    return res;
  }, [chapters, chapterSearch, chapterType, chapterCat, chapterSubCat, chapterSeries, seriesList]);

  const activeChapter = chapters.find(c => c._id === selectedChapterId);

  return (
    <AdminSidebar>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "26px", fontWeight: 700, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>Question & Quiz Hub</h1>
              <p style={{ color: "#9ca3af", margin: "6px 0 0", fontSize: "13px" }}>Manage {questions.length} questions and map them directly to content chapters.</p>
            </div>
            {/* ⚡ HIDE CREATE QUESTION BUTTON IF NOT canEdit */}
            {canEdit && (
              <button onClick={openCreateModal} style={{ backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <Icons.Plus /> Create Question
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px" }}>
            <button onClick={() => setActiveTab("questions")} style={{ background: "none", border: "none", padding: "12px 18px", color: activeTab === "questions" ? "#00D2B4" : "#9ca3af", borderBottom: activeTab === "questions" ? "2px solid #00D2B4" : "none", fontWeight: activeTab === "questions" ? "bold" : "normal", cursor: "pointer", fontSize: "14px", transition: "color 0.2s" }}>
              Question Bank ({questions.length})
            </button>
            <button onClick={() => setActiveTab("link")} style={{ background: "none", border: "none", padding: "12px 18px", color: activeTab === "link" ? "#00D2B4" : "#9ca3af", borderBottom: activeTab === "link" ? "2px solid #00D2B4" : "none", fontWeight: activeTab === "link" ? "bold" : "normal", cursor: "pointer", fontSize: "14px", transition: "color 0.2s" }}>
              Assign to Chapters
            </button>
          </div>

          {/* TAB 1: QUESTION BANK */}
          {activeTab === "questions" && (
            <div>
              <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", backgroundColor: "#111827", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", maxWidth: "400px" }}>
                <div style={{ color: "#6b7280", display: "flex", marginRight: "10px" }}><Icons.Search /></div>
                <input type="text" placeholder="Search questions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontSize: "13px", outline: "none" }} />
              </div>

              {loadingQuestions ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>Loading questions...</div>
              ) : filteredQuestions.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", backgroundColor: "#111827", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ color: "#9ca3af", margin: 0 }}>No questions found.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
                  {filteredQuestions.map((q) => (
                    <div key={q._id} style={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        {/* 🔥 DATE & TIME DISPLAY */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontSize: "10px", color: "#00D2B4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            ID: {q._id.slice(-6)}
                          </span>
                          <span style={{ fontSize: "10px", color: "#9ca3af", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Icons.Calendar /> {formatDateTime(q.createdAt)}
                          </span>
                        </div>

                        <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 14px 0", color: "#fff", lineHeight: "1.4" }}>{q.question}</h3>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {q.options.map((opt, i) => (
                            <div key={i} style={{ padding: "8px 12px", borderRadius: "6px", fontSize: "13px", backgroundColor: i === q.correct ? "rgba(0, 210, 180, 0.12)" : "rgba(255,255,255,0.03)", border: i === q.correct ? "1px solid rgba(0, 210, 180, 0.4)" : "1px solid rgba(255,255,255,0.06)", color: i === q.correct ? "#00D2B4" : "#d1d5db", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                               {opt} {i === q.correct && <span style={{ fontWeight: 700, fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}><Icons.Check /> Correct</span>}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div style={{ marginTop: "12px", fontSize: "12px", color: "#9ca3af", padding: "10px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "6px", borderLeft: "3px solid #6b7280" }}>
                            <strong style={{ color: "#d1d5db" }}>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                      
                      {/* ⚡ HIDE EDIT & DELETE BUTTONS IF NOT canEdit */}
                      {canEdit && (
                        <div style={{ display: "flex", gap: "10px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <button onClick={() => openEditModal(q)} style={actionBtnStyle}>Edit Question</button>
                          <button onClick={() => handleDeleteQuestion(q._id)} style={{ ...actionBtnStyle, flex: "0 0 auto", backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>Delete</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSIGN QUESTIONS TO CHAPTERS */}
          {activeTab === "link" && (
            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "24px", alignItems: "start" }}>
              
              {/* ⚡ Z-INDEX FIXED LEFT PANEL */}
              <div style={{ backgroundColor: "#111827", borderRadius: "12px", padding: "18px", border: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: "24px", maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column", zIndex: 100 }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px 0", color: "#fff" }}>Filter & Select Chapter</h3>
                
                {/* ⚡ RESTRUCTURED FILTERS SO MENUS DONT CLIP */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", backgroundColor: "#0b0f19", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "0 10px" }}>
                    <Icons.Search />
                    <input type="text" placeholder="Search by title..." value={chapterSearch} onChange={(e) => setChapterSearch(e.target.value)} style={{ width: "100%", padding: "8px", background: "transparent", border: "none", color: "#fff", fontSize: "12px", outline: "none" }} />
                  </div>
                  
                  <div style={{ zIndex: 40 }}>
                    <CustomDropdown value={chapterSeries} onChange={setChapterSeries} placeholder="Series Filter" options={[{value:"all", label:"All Series"}, ...seriesList.map(s=>({value:s._id, label:s.title}))]} />
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", zIndex: 30 }}>
                    <CustomDropdown value={chapterCat} onChange={(v) => { setChapterCat(v); setChapterSubCat("all"); }} placeholder="Category" options={[{value:"all", label:"All Categories"}, ...categories.map(c=>({value:c._id, label:c.name}))]} />
                    <CustomDropdown value={chapterSubCat} onChange={setChapterSubCat} placeholder="Sub-Category" options={[{value:"all", label:"All Subs"}, ...availableSubCats.map((c: any) => ({value:c._id, label:c.name}))]} />
                  </div>
                  
                  <div style={{ zIndex: 20 }}>
                    <CustomDropdown value={chapterType} onChange={setChapterType} placeholder="Content Type" options={[{value:"all", label:"Any Media"}, {value:"pdf", label:"PDF Document", badgeColor:"teal"}, {value:"audio", label:"Audio Book", badgeColor:"amber"}]} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
                  {filteredChapters.map((ch) => {
                    const isSelected = ch._id === selectedChapterId;
                    return (
                      <div key={ch._id} onClick={() => handleSelectChapter(ch._id)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: isSelected ? "rgba(0, 210, 180, 0.12)" : "rgba(255,255,255,0.03)", border: isSelected ? "1px solid rgba(0, 210, 180, 0.4)" : "1px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "all 0.15s ease" }}>
                        <img src={ch.cover || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c"} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c"; }} style={{ width: "32px", height: "42px", objectFit: "cover", borderRadius: "4px", backgroundColor: "#0b0f19" }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: isSelected ? "#00D2B4" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "2px" }}>{ch.title}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 4px", borderRadius: "3px", backgroundColor: ch.type === "audio" ? "rgba(245, 158, 11, 0.2)" : "rgba(0, 210, 180, 0.2)", color: ch.type === "audio" ? "#fbbf24" : "#00D2B4", textTransform: "uppercase" }}>{ch.type || "pdf"}</span>
                            <span style={{ fontSize: "11px", color: "#9ca3af" }}>{ch.questions?.length || 0} Linked</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Assignment Right Panel */}
              <div style={{ backgroundColor: "#111827", borderRadius: "12px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)", minHeight: "600px", zIndex: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#fff", fontWeight: 700 }}>Map to: <span style={{ color: "#00D2B4" }}>{activeChapter?.title || "Select Chapter"}</span></h3>
                  </div>
                  {/* ⚡ HIDE SAVE MAPPING BUTTON IF NOT canEdit */}
                  {canEdit && (
                    <button onClick={handleSaveToChapter} disabled={savingChapter || !selectedChapterId} style={{ backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "13px", fontWeight: 700, cursor: savingChapter ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                      {savingChapter ? "Saving..." : <><Icons.Check /> Save Mapping</>}
                    </button>
                  )}
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
                  {questions.map((q) => {
                    const isChecked = assignedQuestionIds.includes(q._id);
                    return (
                      <div key={q._id} onClick={() => canEdit && setAssignedQuestionIds(prev => prev.includes(q._id) ? prev.filter(id => id !== q._id) : [...prev, q._id])} style={{ padding: "14px", borderRadius: "10px", backgroundColor: isChecked ? "rgba(0, 210, 180, 0.08)" : "rgba(255,255,255,0.02)", border: isChecked ? "1px solid rgba(0, 210, 180, 0.4)" : "1px solid rgba(255,255,255,0.06)", cursor: canEdit ? "pointer" : "default", display: "flex", gap: "12px", transition: "all 0.15s ease" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "6px", border: isChecked ? "none" : "1px solid #6b7280", backgroundColor: isChecked ? "#00D2B4" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                          {isChecked && <Icons.Check />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: isChecked ? "#fff" : "#d1d5db", marginBottom: "4px", lineHeight: "1.4" }}>
                            {q.question}
                          </div>
                          <div style={{ fontSize: "12px", color: isChecked ? "#00D2B4" : "#9ca3af", fontWeight: isChecked ? 600 : 400 }}>
                            Ans: {q.options[q.correct]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ backgroundColor: "#161d2d", borderRadius: "14px", padding: "24px", width: "100%", maxWidth: "600px", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "19px", fontWeight: 700, margin: 0, color: "#fff" }}>
                {editingQuestionId ? "Edit Question" : "Create New Question"}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#9ca3af", width: "30px", height: "30px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icons.Close /></button>
            </div>

            <form onSubmit={handleSubmitQuestion}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Question Text *</label>
                <textarea required rows={3} value={formQuestion} onChange={(e) => setFormQuestion(e.target.value)} style={inputStyle} placeholder="What is the main objective of..." />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Options (Select the correct one) *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {formOptions.map((opt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: formCorrect === i ? "rgba(0, 210, 180, 0.08)" : "transparent", padding: "4px", borderRadius: "10px", border: formCorrect === i ? "1px solid rgba(0, 210, 180, 0.3)" : "1px solid transparent", transition: "all 0.2s" }}>
                      <div 
                        onClick={() => setFormCorrect(i)}
                        style={{ width: "22px", height: "22px", borderRadius: "50%", border: formCorrect === i ? "6px solid #00D2B4" : "2px solid #6b7280", cursor: "pointer", flexShrink: 0, marginLeft: "4px" }}
                      />
                      <input type="text" required placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const updated = [...formOptions]; updated[i] = e.target.value; setFormOptions(updated); }} style={{ ...inputStyle, marginBottom: 0, border: "1px solid rgba(255,255,255,0.1)" }} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Explanation (Optional)</label>
                <textarea rows={2} value={formExplanation} onChange={(e) => setFormExplanation(e.target.value)} placeholder="Provide reasoning for the correct answer..." style={inputStyle} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 18px", backgroundColor: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: "10px 24px", backgroundColor: "#00D2B4", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontSize: "13px" }}>
                  {submitting ? "Saving..." : "Save Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminSidebar>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "6px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "#0b0f19", color: "#fff", outline: "none", boxSizing: "border-box", fontSize: "13px" };
const actionBtnStyle: React.CSSProperties = { flex: 1, padding: "7px 12px", backgroundColor: "rgba(255,255,255,0.07)", color: "#fff", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };