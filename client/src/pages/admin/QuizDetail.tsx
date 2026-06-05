import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, Upload, Download,
  ChevronRight, X, Code2, Check, Copy,
} from "lucide-react";
import Papa from "papaparse";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

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
  requireOtp: boolean;
  _count: { attempts: number };
  questions: Question[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

const OPTION_KEYS = ["option1", "option2", "option3", "option4", "option5", "option6"] as const;
const EXPL_KEYS = ["explanation1", "explanation2", "explanation3", "explanation4", "explanation5", "explanation6"] as const;

function optionLabel(idx: number) { return String.fromCharCode(65 + idx); }

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
    correct: new Set(q.correctAnswers.split(",").map((s) => s.trim()).filter(Boolean)),
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

// ─── Question slide-over panel ─────────────────────────────────────────────────

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
    if (form.type === "MULTIPLE_CHOICE") {
      setForm((f) => ({ ...f, correct: new Set([label]) }));
      return;
    }
    const correct = new Set(form.correct);
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
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex w-full max-w-xl flex-col bg-background border-l border-border overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? "Edit Question" : "Add Question"}
          </h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Type toggle */}
            <div className="space-y-2">
              <Label>Question Type</Label>
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
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {t === "MULTIPLE_CHOICE" ? "Single Answer" : "Multi Select"}
                  </button>
                ))}
              </div>
            </div>

            {/* Question text */}
            <div className="space-y-1.5">
              <Label>Question Text <span className="text-destructive">*</span></Label>
              <Textarea
                required
                value={form.text}
                onChange={(e) => setField("text", e.target.value)}
                rows={3}
                placeholder="Enter the question…"
                className="resize-none"
              />
            </div>

            {/* Options + correct answers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Options &amp; Correct Answer{form.type === "MULTI_SELECT" ? "s" : ""}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {form.type === "MULTIPLE_CHOICE" ? "Mark the one correct answer" : "Mark all correct answers"}
                </span>
              </div>
              <div className="space-y-2">
                {form.options.map((opt, i) => {
                  const label = optionLabel(i);
                  const isCorrect = form.correct.has(label);
                  const hasValue = opt.trim().length > 0;
                  const inputType = form.type === "MULTIPLE_CHOICE" ? "radio" : "checkbox";
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type={inputType}
                          name="correct-answer"
                          checked={isCorrect}
                          disabled={!hasValue}
                          onChange={() => hasValue && toggleCorrect(label)}
                          className="h-4 w-4 flex-shrink-0 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          title={hasValue ? (isCorrect ? "Correct answer" : "Mark as correct") : "Enter option text first"}
                        />
                        <span className="w-5 flex-shrink-0 text-xs font-medium text-muted-foreground">{label}.</span>
                        <Input
                          type="text"
                          value={opt}
                          onChange={(e) => setOption(i, e.target.value)}
                          placeholder={i < 2 ? `Option ${label} (required)` : `Option ${label} (optional)`}
                          className="flex-1"
                        />
                      </div>
                      {hasValue && (
                        <div className="pl-11">
                          <Input
                            type="text"
                            value={form.explanations[i]}
                            onChange={(e) => setExplanation(i, e.target.value)}
                            placeholder="Explanation for this option (optional)"
                            className="text-xs h-8"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overall explanation */}
            <div className="space-y-1.5">
              <Label>Overall Explanation</Label>
              <Textarea
                value={form.overallExplanation}
                onChange={(e) => setField("overallExplanation", e.target.value)}
                rows={2}
                placeholder="Shown after the user answers (optional)"
                className="resize-none"
              />
            </div>

            {/* Domain */}
            <div className="space-y-1.5">
              <Label>Domain / Topic</Label>
              <Input
                type="text"
                value={form.domain}
                onChange={(e) => setField("domain", e.target.value)}
                placeholder="e.g. Networking, Security (optional)"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex gap-3 border-t border-border bg-background px-6 py-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Question"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CSV helpers ────────────────────────────────────────────────────────────────

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

// ─── Main component ─────────────────────────────────────────────────────────────

export default function QuizDetail() {
  const { quizId } = useParams<{ quizId: string }>();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editSettings, setEditSettings] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsTotal, setSettingsTotal] = useState("10");
  const [settingsRequireOtp, setSettingsRequireOtp] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [showEmbed, setShowEmbed] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  function copyEmbedCode() {
    if (!quiz) return;
    const src = `${window.location.origin}/t/${quiz.slug}`;
    const code = `<iframe\n  src="${src}"\n  width="100%"\n  height="700"\n  style="border:none;border-radius:12px;"\n  allow="clipboard-write"\n></iframe>\n<script>\nwindow.addEventListener('message', function(e) {\n  if (e.data?.type === 'quiz-resize') {\n    document.querySelector('iframe[src^="${src}"]').style.height = e.data.height + 'px';\n  }\n});\n<\\/script>`;
    navigator.clipboard.writeText(code).then(() => {
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 1500);
    });
  }

  useEffect(() => {
    if (!quizId) return;
    api.get<Quiz>(`/admin/quizzes/${quizId}`, { headers: authHeader() })
      .then((q) => {
        setQuiz(q);
        setSettingsTitle(q.title);
        setSettingsTotal(String(q.totalQuestionsToDisplay));
        setSettingsRequireOtp(q.requireOtp);
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
        requireOtp: settingsRequireOtp,
      }, { headers: authHeader() });
      setQuiz((prev) => prev ? { ...prev, title: updated.title, slug: updated.slug, totalQuestionsToDisplay: updated.totalQuestionsToDisplay, requireOtp: updated.requireOtp } : prev);
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

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-8 gap-3">
        <p className="text-sm text-muted-foreground">Quiz not found.</p>
        <Link to="/admin/quizzes" className="text-sm text-primary hover:underline">
          ← Back to quizzes
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin/quizzes" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Quizzes
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
        <span className="text-foreground font-medium">{quiz.title}</span>
      </div>

      {/* Settings card */}
      <Card>
        <CardContent className="p-6">
          {editSettings ? (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              {settingsError && (
                <Alert variant="destructive"><AlertDescription>{settingsError}</AlertDescription></Alert>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input type="text" required value={settingsTitle} onChange={(e) => setSettingsTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Questions shown per attempt</Label>
                  <Input type="number" required min={1} value={settingsTotal} onChange={(e) => setSettingsTotal(e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settingsRequireOtp}
                  onChange={(e) => setSettingsRequireOtp(e.target.checked)}
                  className="h-4 w-4 accent-primary cursor-pointer"
                />
                <span className="text-sm text-foreground">Require email OTP to start</span>
              </label>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setEditSettings(false); setSettingsError(null); setSettingsTitle(quiz.title); setSettingsTotal(String(quiz.totalQuestionsToDisplay)); setSettingsRequireOtp(quiz.requireOtp); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSettings}>
                  {savingSettings ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-semibold text-foreground">{quiz.title}</h1>
                <div className="mt-1.5 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <Badge variant="secondary" className="font-mono text-xs">{quiz.slug}</Badge>
                  <span>{quiz.questions.length} questions</span>
                  <span>Shows {quiz.totalQuestionsToDisplay} per attempt</span>
                  <span>{quiz._count.attempts} attempt{quiz._count.attempts !== 1 ? "s" : ""}</span>
                  {quiz.requireOtp && <Badge variant="outline" className="text-xs">OTP required</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEmbed(true)}>
                  <Code2 className="h-3 w-3" /> Embed
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditSettings(true)}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions section */}
      <Card>
        <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
          <CardTitle className="text-sm font-semibold">
            Questions{" "}
            <Badge variant="secondary" className="ml-1.5">{quiz.questions.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {importError && <span className="text-xs text-destructive">{importError}</span>}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" /> Template
            </Button>
            <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium transition-colors ${importing ? "opacity-50 cursor-not-allowed text-muted-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
              <Upload className="h-3.5 w-3.5" />
              {importing ? "Importing…" : "Import CSV"}
              <input
                ref={fileRef} type="file" accept=".csv" className="sr-only"
                disabled={importing} onChange={handleCsvUpload}
              />
            </label>
            <Button size="sm" className="gap-1.5 text-xs" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" /> Add Question
            </Button>
          </div>
        </CardHeader>

        {quiz.questions.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No questions yet</p>
            <button onClick={openAdd} className="mt-3 text-sm font-medium text-primary hover:underline">
              Add your first question →
            </button>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Answers</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quiz.questions.map((q, idx) => (
                <TableRow key={q.id} className="group">
                  <TableCell className="text-muted-foreground tabular-nums text-xs">{idx + 1}</TableCell>
                  <TableCell className="max-w-sm">
                    <p className="text-foreground line-clamp-2 leading-snug">{q.text}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={q.type === "MULTIPLE_CHOICE" ? "secondary" : "default"} className="text-xs">
                      {q.type === "MULTIPLE_CHOICE" ? "Single" : "Multi"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {q.correctAnswers.split(",").map((a) => a.trim()).filter(Boolean).map((a) => (
                        <span key={a} className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                          {a}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{q.domain ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(q)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteQuestionId(q.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Question slide-over */}
      {panelOpen && (
        <QuestionPanel
          quizId={quiz.id}
          editing={editingQuestion}
          onSave={handleQuestionSaved}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {/* Delete question dialog */}
      <Dialog open={!!deleteQuestionId} onOpenChange={(open) => { if (!open) setDeleteQuestionId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete question?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQuestionId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteQuestionId && handleDeleteQuestion(deleteQuestionId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed dialog */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Embed Quiz</DialogTitle>
            <DialogDescription>
              Paste this snippet into any webpage to embed the quiz in an iframe. The iframe height auto-adjusts via postMessage.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre overflow-x-auto">
{`<iframe
  src="${window.location.origin}/t/${quiz?.slug}"
  width="100%"
  height="700"
  style="border:none;border-radius:12px;"
  allow="clipboard-write"
></iframe>
<script>
window.addEventListener('message', function(e) {
  if (e.data?.type === 'quiz-resize') {
    document.querySelector(
      'iframe[src^="${window.location.origin}/t/${quiz?.slug}"]'
    ).style.height = e.data.height + 'px';
  }
});
</script>`}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmbed(false)}>Close</Button>
            <Button onClick={copyEmbedCode} className="gap-1.5">
              {embedCopied
                ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                : <><Copy className="h-3.5 w-3.5" /> Copy Code</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
