import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultOption {
  key: string;
  text: string;
  explanation: string | null;
}

interface QuestionResult {
  id: string;
  text: string;
  type: string;
  options: ResultOption[];
  correctAnswers: string[];
  submittedAnswers: string[];
  isCorrect: boolean;
  overallExplanation: string | null;
  domain: string | null;
}

interface AttemptResult {
  attemptSlug: string;
  quizTitle: string;
  user: { name: string; email: string };
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  submittedAt: string;
  results: QuestionResult[];
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="104" height="104" className="-rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle
          cx="52" cy="52" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-2xl font-bold text-white tabular-nums">
        {score.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttemptResults() {
  const { quizSlug, attemptSlug } = useParams<{ quizSlug: string; attemptSlug: string }>();
  const [data, setData] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizSlug || !attemptSlug) return;
    api.get<AttemptResult>(`/t/${quizSlug}/${attemptSlug}`)
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load results"));
  }, [quizSlug, attemptSlug]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-white mb-2">Could not load results</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const scoreColor = data.score >= 80 ? "text-emerald-400" : data.score >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      {/* Score summary */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-2xl px-6 py-10 text-center">
          <ScoreRing score={data.score} />
          <h1 className="mt-5 text-xl font-bold text-white">{data.quizTitle}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {data.user.name} · {data.user.email}
          </p>

          <div className="mt-6 flex items-center justify-center gap-8">
            <div>
              <p className={`text-3xl font-bold tabular-nums ${scoreColor}`}>
                {data.totalCorrect}/{data.totalQuestions}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Correct</p>
            </div>
            <div className="h-10 w-px bg-gray-800" />
            <div>
              <p className={`text-3xl font-bold tabular-nums ${scoreColor}`}>
                {data.score.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Score</p>
            </div>
          </div>

          <Link
            to={`/t/${quizSlug}`}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            Retake Quiz
          </Link>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="mx-auto max-w-2xl px-6 pt-8 space-y-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Question Review
        </h2>

        {data.results.map((q, idx) => (
          <div
            key={q.id}
            className={`rounded-xl border bg-gray-900 overflow-hidden ${
              q.isCorrect ? "border-emerald-500/30" : "border-red-500/30"
            }`}
          >
            {/* Question header */}
            <div className={`flex items-start gap-3 px-5 py-4 border-b ${
              q.isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
            }`}>
              {q.isCorrect
                ? <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                : <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-gray-500">Q{idx + 1}</span>
                  {q.domain && (
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                      {q.domain}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-white leading-snug">{q.text}</p>
              </div>
            </div>

            {/* Options */}
            <div className="px-5 py-4 space-y-2">
              {q.options.map((opt) => {
                const wasSelected = q.submittedAnswers.includes(opt.key);
                const isCorrect = q.correctAnswers.includes(opt.key);

                let optStyle = "border-gray-700 bg-gray-800/50 text-gray-400";
                let keyStyle = "border-gray-600 text-gray-500";

                if (isCorrect && wasSelected) {
                  optStyle = "border-emerald-500/50 bg-emerald-500/10 text-white";
                  keyStyle = "border-emerald-500 bg-emerald-500 text-white";
                } else if (isCorrect) {
                  optStyle = "border-emerald-500/30 bg-emerald-500/5 text-gray-300";
                  keyStyle = "border-emerald-500/50 text-emerald-400";
                } else if (wasSelected) {
                  optStyle = "border-red-500/50 bg-red-500/10 text-white";
                  keyStyle = "border-red-500 bg-red-500 text-white";
                }

                return (
                  <div key={opt.key} className={`rounded-lg border px-4 py-3 ${optStyle}`}>
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${keyStyle}`}>
                        {opt.key}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{opt.text}</p>
                        {opt.explanation && (
                          <p className="mt-1.5 text-xs text-gray-500 italic">{opt.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall explanation */}
            {q.overallExplanation && (
              <div className="mx-5 mb-4 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
                <p className="text-xs font-medium text-gray-400 mb-1">Explanation</p>
                <p className="text-sm text-gray-300 leading-relaxed">{q.overallExplanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
