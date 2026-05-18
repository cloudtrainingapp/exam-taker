import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizMeta {
  title: string;
  slug: string;
  totalQuestionsToDisplay: number;
  questionCount: number;
}

interface QuizOption {
  key: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "MULTI_SELECT";
  options: QuizOption[];
}

type Stage = "register" | "taking" | "submitting";

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizLanding() {
  const { quizSlug } = useParams<{ quizSlug: string }>();
  const navigate = useNavigate();

  const [meta, setMeta] = useState<QuizMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [startError, setStartError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("register");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [current, setCurrent] = useState(0);
  const [attemptSlug, setAttemptSlug] = useState("");

  useEffect(() => {
    if (!quizSlug) return;
    api.get<QuizMeta>(`/t/${quizSlug}`)
      .then(setMeta)
      .catch((err: unknown) => setMetaError(err instanceof Error ? err.message : "Quiz not found"));
  }, [quizSlug]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setStartError(null);
    setStage("submitting");
    try {
      const res = await api.post<{ attemptSlug: string; questions: QuizQuestion[] }>(
        `/t/${quizSlug}/start`,
        { name, email }
      );
      setAttemptSlug(res.attemptSlug);
      setQuestions(res.questions);
      setAnswers({});
      setCurrent(0);
      setStage("taking");
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : "Failed to start quiz");
      setStage("register");
    }
  }

  function toggleAnswer(questionId: string, key: string, type: QuizQuestion["type"]) {
    setAnswers((prev) => {
      const cur = prev[questionId] ?? [];
      if (type === "MULTIPLE_CHOICE") return { ...prev, [questionId]: [key] };
      if (cur.includes(key)) return { ...prev, [questionId]: cur.filter((k) => k !== key) };
      return { ...prev, [questionId]: [...cur, key] };
    });
  }

  async function handleSubmit() {
    setStage("submitting");
    try {
      await api.post(`/t/${quizSlug}/${attemptSlug}/submit`, { answers });
      navigate(`/t/${quizSlug}/${attemptSlug}`);
    } catch (err: unknown) {
      setStage("taking");
      alert(err instanceof Error ? err.message : "Submission failed. Please try again.");
    }
  }

  const q = questions[current];
  const totalQ = questions.length;
  const answeredCount = questions.filter((q) => (answers[q.id] ?? []).length > 0).length;
  const isLast = current === totalQ - 1;
  const currentAnswers = q ? (answers[q.id] ?? []) : [];

  // ── Loading / error ───────────────────────────────────────────────────────

  if (metaError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-white mb-2">Quiz not found</p>
          <p className="text-sm text-gray-500">{metaError}</p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  // ── Register screen ───────────────────────────────────────────────────────

  if (stage === "register") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">{meta.title}</h1>
            <p className="text-sm text-gray-500">
              {meta.totalQuestionsToDisplay} questions
              {meta.questionCount > meta.totalQuestionsToDisplay
                ? ` · randomly selected from ${meta.questionCount}`
                : ""}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
            <h2 className="text-base font-semibold text-white mb-6">Enter your details to begin</h2>
            <form onSubmit={handleStart} className="space-y-4">
              {startError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {startError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email Address</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors mt-2"
              >
                Start Quiz
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitting spinner ────────────────────────────────────────────────────

  if (stage === "submitting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        <p className="text-sm text-gray-400">Submitting your answers…</p>
      </div>
    );
  }

  // ── Quiz taking ───────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      {/* Header / progress */}
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">{meta.title}</span>
            <span className="text-xs text-gray-500 tabular-nums">
              {answeredCount} / {totalQ} answered
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${((current + 1) / totalQ) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-600">Question {current + 1} of {totalQ}</p>
        </div>
      </header>

      {/* Question body */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 mb-4 ${
            q.type === "MULTIPLE_CHOICE"
              ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
              : "bg-violet-500/10 text-violet-400 ring-violet-500/20"
          }`}>
            {q.type === "MULTIPLE_CHOICE" ? "Single answer" : "Select all that apply"}
          </span>

          <h2 className="text-lg font-semibold text-white leading-snug mb-6">{q.text}</h2>

          <div className="space-y-3">
            {q.options.map((opt) => {
              const selected = currentAnswers.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleAnswer(q.id, opt.key, q.type)}
                  className={`w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-800"
                  }`}
                >
                  <span className={`mt-0.5 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    selected ? "border-violet-500 bg-violet-500 text-white" : "border-gray-600 text-gray-500"
                  }`}>
                    {opt.key}
                  </span>
                  <span className={`text-sm leading-relaxed ${selected ? "text-white" : "text-gray-300"}`}>
                    {opt.text}
                  </span>
                  <span className="ml-auto flex-shrink-0 mt-0.5">
                    {selected
                      ? <CheckCircle2 className="h-4 w-4 text-violet-400" />
                      : <Circle className="h-4 w-4 text-gray-700" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Navigation footer */}
      <footer className="border-t border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          {/* Dot navigator */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {questions.map((q, i) => {
              const answered = (answers[q.id] ?? []).length > 0;
              const isCurrent = i === current;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all ${
                    isCurrent
                      ? "h-2.5 w-2.5 bg-violet-400"
                      : answered
                      ? "h-2 w-2 bg-violet-600"
                      : "h-2 w-2 bg-gray-700 hover:bg-gray-500"
                  }`}
                  title={`Question ${i + 1}${answered ? " (answered)" : ""}`}
                />
              );
            })}
          </div>

          {isLast ? (
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={() => setCurrent((c) => Math.min(totalQ - 1, c + 1))}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
