import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, Upload, Download,
  ChevronLeft, ChevronRight, X, Check,
} from "lucide-react";
import Papa from "papaparse";
import { api } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "MULTI_SELECT";
  option1: string | null; option2: string | null; option3: string | null;
  option4: string | null; option5: string | null; option6: string | null;
  explanation1: string | null; explanation2: string | null; explanation3: string | null;
  explanation4: string | null; explanation5: string | null; explanation6: string | null;
  correctAnswers: string;
  overallExplanation: string;
  domain: string | null;
}

interface Quiz {
  id: string;
  title: string;
  slug: string;
  totalQuestionsToDisplay: number;
  _count: { attempts: number };
  questions: Question[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

const OPTION_KEYS = ["option1", "option2", "option3", "option4", "option5", "option6"] as const;
const EXPL_KEYS = ["explanation1", "explanation2", "explanation3", "explanation4", "explanation5", "explanation6"] as const;

function correctSet(q: { correctAnswers: string }): Set<string> {
  return new Set(q.correctAnswers.split(",").map((s) => s.trim()).filter(Boolean));
}

function optionLabel(idx: number) { return String.fromCharCode(65 + idx); }

// ─── Empty question form ───────────────────────────────────────────────────────

interface QuestionForm {
  text: string;
  type: "MULTIPLE_CHOICE" | "MULTI_SELECT";
  options: string[];
  explanations: string[];
  correct: Set<string>;
  overallExplanation: string;
  domain: string;
}

function emptyForm(): QuestionForm {
  return {
    text: "",
    type: "MULTIPLE_CHOICE",
    options: ["", "", "", "", "", ""],
    explanations: ["", "", "", "", "", ""],
    correct: new Set(),
    overallExplanation: "",
    domain: "",
  };
}

function formFromQuestion(q: Question): QuestionForm {
  return {
    text: q.text,
    type: q.type,
    options: OPTION_KEYS.map((k) => q[k] ?? ""),
    explanations: EXPL_KEYS.map((k) => q[k] ?? ""),
    correct: correctSet(q),
    overallExplanation: q.overallExplanation ?? "",
    domain: q.domain ?? "",
  };
}

function formToPayload(f: QuestionForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    text: f.text,
    type: f.type,
    correctAnswers: [...f.correct].sort().join(","),
    overallExplanation: f.overallExplanation,
    domain: f.domain || null,
  };
  OPTION_KEYS.forEach((k, i) => { payload[k] = f.options[i] || null; });
  EXPL_KEYS.forEach((k, i) => { payload[k] = f.explanations[i] || null; });
  return payload;
}

// ─── QuestionPanel ─────────────────────────────────────────────────────────────

interface QuestionPanelProps {
  quizId: string;
  editing: Question | null;
  onSave: (q: Question) => void;
  onClose: () => void;
}

function QuestionPanel({ quizId, editing, onSave, onClose }: QuestionPanelProps) {
  const [form, setForm] = useState<QuestionForm>(() =>
    editing ? formFromQuestion(editing) : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionCount = form.options.filter((o) => o.trim()).length;
  const hasEnoughOptions = optionCount >= 2;

  function setField<K extends keyof QuestionForm>(k: K, v: QuestionForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setOption(i: number, v: string) {
    const next = [...form.options];
    next[i] = v;
    // if option cleared, remove from correct
    if (!v.trim()) {
      const label = optionLabel(i);
      const correct = new Set(form.correct);
      correct.delete(label);
      setForm((f) => ({ ...f, options: next, correct }));
    } else {
      setForm((f) => ({ ...f, options: next }));
    }
  }

  function setExplanation(i: number, v: string) {
    const next = [...form.explanations];
    next[i] = v;
    setForm((f) => ({ ...f, explanations: next }));
  }

  function toggleCorrect(label: string) {
    const correct = new Set(form.correct);
    if (form.type === "MULTIPLE_CHOICE") {
      setForm((f) => ({ ...f, correct: new Set([label]) }));
      return;
    }
    if (correct.has(label)) correct.delete(label);
    else correct.add(label);
    setForm((f) => ({ ...f, correct }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.text.trim()) { setError("Question text is required"); return; }
    if (!hasEnoughOptions) { setError("At least 2 options are required"); return; }
    if (form.correct.size === 0) { setError("Select at least one correct answer"); return; }
    if (form.type === "MULTIPLE_CHOICE" && form.correct.size > 1) {
      setError("MULTIPLE_CHOICE must have exactly one correct answer");
      return;
    }

    setSaving(true);
    try {
      const payload = formToPayload(form);
      let saved: Question;
      if (editing) {
        saved = await api.patch<Question>(`/admin/questions/${editing.id}`, payload, { headers: authHeader() });
      } else {
        saved = await api.post<Question>(`/admin/quizzes/${quizId}/questions`, payload, { headers: authHeader() });
      }
      onSave(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex w-full max-w-xl flex-col bg-gray-950 border-l border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {editing ? "Edit Question" : "Add Question"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            {/* Type toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Question Type</label>
              <div className="flex gap-2">
                {(["MULTIPLE_CHOICE", "MULTI_SELECT"] as const).map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => {
                      setField("type", t);
                      if (t === "MULTIPLE_CHOICE" && form.correct.size > 1) {
                        setField("correct", new Set());
                      }
                    }}
                    className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors border ${
                      form.type === t
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                    }`}
                  >
                    {t === "MULTIPLE_CHOICE" ? "Single Answer" : "Multi Select"}
                  </button>
                ))}
              </div>
            </div>

            {/* Question text */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Question Text <span className="text-red-400">*</span></label>
              <textarea
                required value={form.text} onChange={(e) => setField("text", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition resize-none"
                placeholder="Enter the question…"
              />
            </div>

            {/* Options + correct answers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400">
                  Options & Correct Answer{form.type === "MULTI_SELECT" ? "s" : ""}
                </label>
                <span className="text-xs text-gray-600">
                  {form.type === "MULTIPLE_CHOICE" ? "Select one" : "Select all that apply"}
                </span>
              </div>
              <div className="space-y-2">
                {form.options.map((opt, i) => {
                  const label = optionLabel(i);
                  const isCorrect = form.correct.has(label);
                  const hasValue = opt.trim().length > 0;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <button
                        type="button"
                        disabled={!hasValue}
                        onClick={() => hasValue && toggleCorrect(label)}
                        className={`mt-2.5 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                          isCorrect
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : hasValue
                            ? "border-gray-600 hover:border-gray-400"
                            : "border-gray-800 cursor-not-allowed"
                        } ${form.type === "MULTIPLE_CHOICE" ? "rounded-full" : "rounded"}`}
                        title={isCorrect ? "Correct answer" : "Mark as correct"}
                      >
                        {isCorrect && <Check className="h-3 w-3" />}
                      </button>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 flex-shrink-0 text-xs font-medium text-gray-500">{label}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => setOption(i, e.target.value)}
                            placeholder={i < 2 ? `Option ${label} (required)` : `Option ${label} (optional)`}
                            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                          />
                        </div>
                        {hasValue && (
                          <div className="flex items-center gap-2 pl-7">
                            <input
                              type="text"
                              value={form.explanations[i]}
                              onChange={(e) => setExplanation(i, e.target.value)}
                              placeholder="Explanation for this option (optional)"
                              className="flex-1 rounded-lg border border-gray-700/60 bg-gray-800/50 px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/10 transition"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall explanation */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Overall Explanation</label>
              <textarea
                value={form.overallExplanation}
                onChange={(e) => setField("overallExplanation", e.target.value)}
                rows={2}
                placeholder="Shown after the user answers (optional)"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition resize-none"
              />
            </div>

            {/* Domain */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Domain / Topic</label>
              <input
                type="text" value={form.domain} onChange={(e) => setField("domain", e.target.value)}
                placeholder="e.g. Networking, Security (optional)"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex gap-3 border-t border-gray-800 bg-gray-950 px-6 py-4">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CSV Import ────────────────────────────────────────────────────────────────

const CSV_TEMPLATE_HEADERS = [
  "Question", "Question Type",
  "Answer Option 1", "Explanation 1",
  "Answer Option 2", "Explanation 2",
  "Answer Option 3", "Explanation 3",
  "Answer Option 4", "Explanation 4",
  "Answer Option 5", "Explanation 5",
  "Answer Option 6", "Explanation 6",
  "Correct Answers", "Overall Explanation", "Domain",
];

function downloadTemplate() {
  const rows = [
    [
      "What is 2+2?", "multiple-choice",
      "3", "",
      "4", "This is the correct answer",
      "5", "",
      "", "", "", "", "", "",
      "2", "Basic arithmetic", "Math",
    ],
    [
      "Which are primary colors?", "multi-select",
      "Red", "A primary color",
      "Green", "",
      "Blue", "A primary color",
      "Purple", "",
      "", "", "", "", "",
      "1,3", "Red and Blue are primary colors", "Art",
    ],
  ];
  const csv = [CSV_TEMPLATE_HEADERS.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "questions-template.csv"; a.click();
  URL.revokeObjectURL(url);
}

function normaliseQuestionType(raw: string): string {
  return raw.trim().toUpperCase().replace(/-/g, "_");
}

function nullIfEmpty(v: string | undefined): string | null {
  return v !== undefined && v.trim() !== "" ? v.trim() : null;
}

function remapCsvRow(row: Record<string, string>): Record<string, unknown> {
  const correctRaw = (row["Correct Answers"] ?? "").trim();
  const correctAnswers = correctRaw
    .split(",")
    .map((n) => {
      const idx = parseInt(n.trim(), 10);
      return !isNaN(idx) && idx >= 1 && idx <= 6 ? optionLabel(idx - 1) : null;
    })
    .filter((v): v is string => v !== null)
    .sort()
    .join(",");

  return {
    text: row["Question"] ?? "",
    type: normaliseQuestionType(row["Question Type"] ?? ""),
    option1: nullIfEmpty(row["Answer Option 1"]),
    option2: nullIfEmpty(row["Answer Option 2"]),
    option3: nullIfEmpty(row["Answer Option 3"]),
    option4: nullIfEmpty(row["Answer Option 4"]),
    option5: nullIfEmpty(row["Answer Option 5"]),
    option6: nullIfEmpty(row["Answer Option 6"]),
    explanation1: nullIfEmpty(row["Explanation 1"]),
    explanation2: nullIfEmpty(row["Explanation 2"]),
    explanation3: nullIfEmpty(row["Explanation 3"]),
    explanation4: nullIfEmpty(row["Explanation 4"]),
    explanation5: nullIfEmpty(row["Explanation 5"]),
    explanation6: nullIfEmpty(row["Explanation 6"]),
    correctAnswers,
    overallExplanation: row["Overall Explanation"] ?? "",
    domain: nullIfEmpty(row["Domain"]),
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function QuizDetail() {
  const { quizId } = useParams<{ quizId: string }>();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Settings edit
  const [editSettings, setEditSettings] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsTotal, setSettingsTotal] = useState("10");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Question panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Delete question
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  // CSV import
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) return;
    api.get<Quiz>(`/admin/quizzes/${quizId}`, { headers: authHeader() })
      .then((q) => {
        setQuiz(q);
        setSettingsTitle(q.title);
        setSettingsTotal(String(q.totalQuestionsToDisplay));
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes("404")) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!quiz) return;
    setSettingsError(null);
    setSavingSettings(true);
    try {
      const updated = await api.patch<Quiz>(`/admin/quizzes/${quiz.id}`, {
        title: settingsTitle,
        totalQuestionsToDisplay: Number(settingsTotal),
      }, { headers: authHeader() });
      setQuiz((prev) => prev ? { ...prev, title: updated.title, slug: updated.slug, totalQuestionsToDisplay: updated.totalQuestionsToDisplay } : prev);
      setEditSettings(false);
    } catch (err: unknown) {
      setSettingsError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingSettings(false);
    }
  }

  function openAdd() { setEditingQuestion(null); setPanelOpen(true); }
  function openEdit(q: Question) { setEditingQuestion(q); setPanelOpen(true); }

  function handleQuestionSaved(saved: Question) {
    setQuiz((prev) => {
      if (!prev) return prev;
      const existing = prev.questions.findIndex((q) => q.id === saved.id);
      if (existing >= 0) {
        const questions = [...prev.questions];
        questions[existing] = saved;
        return { ...prev, questions };
      }
      return { ...prev, questions: [...prev.questions, saved] };
    });
    setPanelOpen(false);
  }

  async function handleDeleteQuestion(id: string) {
    try {
      await api.delete(`/admin/questions/${id}`, { headers: authHeader() });
      setQuiz((prev) => prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== id) } : prev);
    } finally {
      setDeleteQuestionId(null);
    }
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !quiz) return;
    setImportError(null);
    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = (results.data as Record<string, string>[]).map(remapCsvRow);
          const { imported } = await api.post<{ imported: number }>(
            `/admin/quizzes/${quiz.id}/questions/bulk`,
            rows,
            { headers: authHeader() }
          );

          // Re-fetch to get real question IDs
          const refreshed = await api.get<Quiz>(`/admin/quizzes/${quiz.id}`, { headers: authHeader() });
          setQuiz(refreshed);

          alert(`Imported ${imported} question${imported !== 1 ? "s" : ""} successfully.`);
        } catch (err: unknown) {
          setImportError(err instanceof Error ? err.message : "Import failed");
        } finally {
          setImporting(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      },
      error: () => {
        setImportError("Could not parse CSV file");
        setImporting(false);
      },
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-800" />
        <div className="h-32 animate-pulse rounded-xl bg-gray-800" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-800" />
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-8 gap-3">
        <p className="text-sm text-gray-400">Quiz not found.</p>
        <Link to="/admin/quizzes" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          ← Back to quizzes
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link to="/admin/quizzes" className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Quizzes
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-700" />
        <span className="text-gray-300 font-medium">{quiz.title}</span>
      </div>

      {/* Settings card */}
      <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
        {editSettings ? (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            {settingsError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{settingsError}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Title</label>
                <input
                  type="text" required value={settingsTitle} onChange={(e) => setSettingsTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Questions shown per attempt</label>
                <input
                  type="number" required min={1} value={settingsTotal} onChange={(e) => setSettingsTotal(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setEditSettings(false); setSettingsError(null); setSettingsTitle(quiz.title); setSettingsTotal(String(quiz.totalQuestionsToDisplay)); }}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={savingSettings}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
                {savingSettings ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">{quiz.title}</h1>
              <div className="mt-1.5 flex items-center gap-4 text-sm text-gray-500">
                <span><code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-300">{quiz.slug}</code></span>
                <span>{quiz.questions.length} questions</span>
                <span>Shows {quiz.totalQuestionsToDisplay} per attempt</span>
                <span>{quiz._count.attempts} attempt{quiz._count.attempts !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <button onClick={() => setEditSettings(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Questions section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">
            Questions <span className="ml-1.5 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{quiz.questions.length}</span>
          </h2>
          <div className="flex items-center gap-2">
            {importError && (
              <span className="text-xs text-red-400">{importError}</span>
            )}
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors">
              <Download className="h-3.5 w-3.5" /> Template
            </button>
            <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium transition-colors ${importing ? "opacity-50 cursor-not-allowed text-gray-600" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}>
              <Upload className="h-3.5 w-3.5" />
              {importing ? "Importing…" : "Import CSV"}
              <input
                ref={fileRef} type="file" accept=".csv" className="sr-only"
                disabled={importing} onChange={handleCsvUpload}
              />
            </label>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Question
            </button>
          </div>
        </div>

        {quiz.questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-gray-500">No questions yet</p>
            <button onClick={openAdd} className="mt-3 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
              Add your first question →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
                <th className="px-6 py-3 font-medium w-8">#</th>
                <th className="px-6 py-3 font-medium">Question</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Answers</th>
                <th className="px-6 py-3 font-medium">Domain</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {quiz.questions.map((q, idx) => (
                <tr key={q.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5 text-gray-600 tabular-nums text-xs">{idx + 1}</td>
                  <td className="px-6 py-3.5 max-w-sm">
                    <p className="text-gray-200 line-clamp-2 leading-snug">{q.text}</p>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      q.type === "MULTIPLE_CHOICE"
                        ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                        : "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20"
                    }`}>
                      {q.type === "MULTIPLE_CHOICE" ? "Single" : "Multi"}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {q.correctAnswers.split(",").map((a) => a.trim()).filter(Boolean).map((a) => (
                        <span key={a} className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                          {a}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500 text-xs">{q.domain ?? "—"}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(q)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-200 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteQuestionId(q.id)}
                        className="rounded-md p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Question slide-over */}
      {panelOpen && (
        <QuestionPanel
          quizId={quiz.id}
          editing={editingQuestion}
          onSave={handleQuestionSaved}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {/* Delete question confirm */}
      {deleteQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Delete question?</h2>
            <p className="text-sm text-gray-400 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteQuestionId(null)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDeleteQuestion(deleteQuestionId)}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination placeholder for future use */}
      {quiz.questions.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
          <span>{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} total</span>
          <div className="flex items-center gap-1">
            <button disabled className="rounded-md p-1.5 text-gray-700 disabled:cursor-not-allowed">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button disabled className="rounded-md p-1.5 text-gray-700 disabled:cursor-not-allowed">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
