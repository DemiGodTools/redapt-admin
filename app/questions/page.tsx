"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

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
  questions?: (IQuestionItem | string)[];
}

export default function QuestionsAdminPage() {
  const [activeTab, setActiveTab] = useState<"questions" | "link">("questions");

  // Questions State
  const [questions, setQuestions] = useState<IQuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Chapters State
  const [chapters, setChapters] = useState<IChapterItem[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [assignedQuestionIds, setAssignedQuestionIds] = useState<string[]>([]);
  const [savingChapter, setSavingChapter] = useState(false);

  // Modal State (Create / Edit Question)
  const [showModal, setShowModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["", "", "", ""]);
  const [formCorrect, setFormCorrect] = useState(0);
  const [formExplanation, setFormExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch Questions
  const fetchQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const res = await fetch("/api/admin/question");
      const data = await res.json().catch(() => null);
      if (data?.success) {
        setQuestions(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // 2. Fetch Chapters
  const fetchChapters = async () => {
    try {
      let res = await fetch("/api/admin/chapter").catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("/api/chapter").catch(() => null);
      }
      const data = await res?.json().catch(() => null);
      if (data?.success && Array.isArray(data.data)) {
        setChapters(data.data);
        if (data.data.length > 0 && !selectedChapterId) {
          const first = data.data[0];
          setSelectedChapterId(first._id);
          const qIds = (first.questions || []).map((q: any) =>
            typeof q === "string" ? q : q._id
          );
          setAssignedQuestionIds(qIds);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchChapters();
  }, []);

  const handleSelectChapter = (chId: string) => {
    setSelectedChapterId(chId);
    const target = chapters.find((c) => c._id === chId);
    if (target) {
      const qIds = (target.questions || []).map((q: any) =>
        typeof q === "string" ? q : q._id
      );
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
    setFormOptions(
      q.options && q.options.length === 4
        ? [...q.options]
        : [q.options[0] || "", q.options[1] || "", q.options[2] || "", q.options[3] || ""]
    );
    setFormCorrect(typeof q.correct === "number" ? q.correct : 0);
    setFormExplanation(q.explanation || "");
    setShowModal(true);
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim()) {
      alert("Please enter question text");
      return;
    }
    if (formOptions.some((opt) => !opt.trim())) {
      alert("Please fill all 4 options");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        question: formQuestion.trim(),
        options: formOptions.map((o) => o.trim()),
        correct: Number(formCorrect),
        explanation: formExplanation.trim(),
      };

      const url = editingQuestionId
        ? `/api/admin/question?id=${editingQuestionId}`
        : `/api/admin/question`;

      const method = editingQuestionId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => null);

      if (resData?.success) {
        setShowModal(false);
        fetchQuestions();
        fetchChapters();
      } else {
        alert(resData?.message || "Failed to save question");
      }
    } catch (err: any) {
      alert(err?.message || "Error saving question");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/question?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        fetchQuestions();
        fetchChapters();
      } else {
        alert(data?.message || "Delete failed");
      }
    } catch (e: any) {
      alert(e.message || "Delete error");
    }
  };

  const toggleAssignQuestion = (qId: string) => {
    setAssignedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleSaveToChapter = async () => {
    if (!selectedChapterId) return;
    setSavingChapter(true);
    try {
      const res = await fetch(`/api/admin/chapter?id=${selectedChapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedChapterId,
          questions: assignedQuestionIds,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        alert("Questions successfully linked to Chapter in MongoDB!");
        fetchChapters();
      } else {
        alert(data?.message || "Failed to link questions to Chapter");
      }
    } catch (e: any) {
      alert(e?.message || "Failed to link questions");
    } finally {
      setSavingChapter(false);
    }
  };

  const filteredQuestions = questions.filter((q) =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "32px", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f3f4f6", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, color: "#fff" }}>
            Question & Quiz Hub
          </h1>
          <p style={{ color: "#9ca3af", margin: "6px 0 0 0", fontSize: "14px" }}>
            Create questions, manage question bank, and link them to chapters.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/chapters"
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
            📖 Chapters
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
            + Add New Question
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab("questions")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 18px",
            color: activeTab === "questions" ? "#00D2B4" : "#9ca3af",
            borderBottom: activeTab === "questions" ? "2px solid #00D2B4" : "none",
            fontWeight: activeTab === "questions" ? "bold" : "normal",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          Question Bank ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab("link")}
          style={{
            background: "none",
            border: "none",
            padding: "12px 18px",
            color: activeTab === "link" ? "#00D2B4" : "#9ca3af",
            borderBottom: activeTab === "link" ? "2px solid #00D2B4" : "none",
            fontWeight: activeTab === "link" ? "bold" : "normal",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          Assign to Chapters
        </button>
      </div>

      {/* TAB 1: QUESTION BANK */}
      {activeTab === "questions" && (
        <div>
          <div style={{ marginBottom: "18px" }}>
            <input
              type="text"
              placeholder="Search question..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.15)",
                backgroundColor: "#161d2d",
                color: "#fff",
                outline: "none",
              }}
            />
          </div>

          {loadingQuestions ? (
            <p style={{ color: "#9ca3af" }}>Loading questions...</p>
          ) : filteredQuestions.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#111827", borderRadius: "12px" }}>
              <p style={{ color: "#9ca3af" }}>No questions found. Click "+ Add New Question" to create one.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
              {filteredQuestions.map((q) => (
                <div
                  key={q._id}
                  style={{
                    backgroundColor: "#111827",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", color: "#00D2B4", fontWeight: "bold", textTransform: "uppercase" }}>
                      ID: {q._id.slice(-6)}
                    </span>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "8px 0 14px 0", color: "#fff" }}>
                      {q.question}
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            backgroundColor: i === q.correct ? "rgba(0, 210, 180, 0.15)" : "rgba(255,255,255,0.03)",
                            border: i === q.correct ? "1px solid #00D2B4" : "1px solid rgba(255,255,255,0.06)",
                            color: i === q.correct ? "#00D2B4" : "#d1d5db",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>{opt}</span>
                          {i === q.correct && <span style={{ fontWeight: "bold", fontSize: "11px" }}>✓ Correct</span>}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0, fontStyle: "italic" }}>
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                    <button
                      onClick={() => openEditModal(q)}
                      style={{
                        flex: 1,
                        padding: "7px 12px",
                        backgroundColor: "rgba(255,255,255,0.08)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q._id)}
                      style={{
                        padding: "7px 12px",
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        color: "#ef4444",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGN QUESTIONS TO CHAPTERS */}
      {activeTab === "link" && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px" }}>
          {/* Chapter Selector */}
          <div style={{ backgroundColor: "#111827", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "bold", marginTop: 0, marginBottom: "14px", color: "#00D2B4" }}>
              Select Chapter
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "650px", overflowY: "auto" }}>
              {chapters.map((ch) => {
                const isSelected = ch._id === selectedChapterId;
                const count = ch.questions?.length || 0;
                return (
                  <div
                    key={ch._id}
                    onClick={() => handleSelectChapter(ch._id)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      backgroundColor: isSelected ? "rgba(0, 210, 180, 0.12)" : "rgba(255,255,255,0.03)",
                      border: isSelected ? "1px solid #00D2B4" : "1px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {ch.cover && (
                      <img src={ch.cover} alt="" style={{ width: "36px", height: "48px", objectFit: "cover", borderRadius: "4px" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ch.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {count} Questions linked
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Assignment Panel */}
          <div style={{ backgroundColor: "#111827", borderRadius: "12px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>
                  Link Questions to:{" "}
                  <span style={{ color: "#00D2B4" }}>
                    {chapters.find((c) => c._id === selectedChapterId)?.title || "Select Chapter"}
                  </span>
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#9ca3af" }}>
                  Selected: {assignedQuestionIds.length} questions
                </p>
              </div>

              <button
                onClick={handleSaveToChapter}
                disabled={savingChapter || !selectedChapterId}
                style={{
                  backgroundColor: "#00D2B4",
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 24px",
                  fontWeight: "bold",
                  cursor: savingChapter ? "not-allowed" : "pointer",
                }}
              >
                {savingChapter ? "Saving..." : "Save to Chapter"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "580px", overflowY: "auto" }}>
              {questions.map((q) => {
                const isChecked = assignedQuestionIds.includes(q._id);
                return (
                  <div
                    key={q._id}
                    onClick={() => toggleAssignQuestion(q._id)}
                    style={{
                      padding: "14px",
                      borderRadius: "8px",
                      backgroundColor: isChecked ? "rgba(0, 210, 180, 0.08)" : "rgba(255,255,255,0.02)",
                      border: isChecked ? "1px solid #00D2B4" : "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ width: "18px", height: "18px", accentColor: "#00D2B4", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginBottom: "4px" }}>
                        {q.question}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                        Answer: Option {q.correct + 1} ({q.options[q.correct]})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#161d2d",
              borderRadius: "14px",
              padding: "24px",
              width: "100%",
              maxWidth: "560px",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginTop: 0, marginBottom: "18px" }}>
              {editingQuestionId ? "Edit Question" : "Create New Question"}
            </h2>

            <form onSubmit={handleSubmitQuestion}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                  Question Text:
                </label>
                <textarea
                  required
                  rows={3}
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    backgroundColor: "#0b0f19",
                    color: "#fff",
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g. What is the significance of chapter 1?"
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                  Options & Select Correct:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {formOptions.map((opt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="radio"
                        name="correctOption"
                        checked={formCorrect === i}
                        onChange={() => setFormCorrect(i)}
                        style={{ accentColor: "#00D2B4", width: "16px", height: "16px", cursor: "pointer" }}
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        required
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...formOptions];
                          updated[i] = e.target.value;
                          setFormOptions(updated);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          backgroundColor: "#0b0f19",
                          color: "#fff",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#9ca3af", marginBottom: "6px" }}>
                  Explanation (Shown after user answers):
                </label>
                <input
                  type="text"
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Why is this option correct?"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    backgroundColor: "#0b0f19",
                    color: "#fff",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "transparent",
                    color: "#9ca3af",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 20px",
                    backgroundColor: "#00D2B4",
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Saving..." : "Save Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}