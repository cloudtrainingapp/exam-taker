import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

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

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="104" height="104" className="-rotate-90">
        <circle cx="52" cy="52" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
        <circle
          cx="52" cy="52" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-2xl font-bold text-foreground tabular-nums">
        {score.toFixed(0)}%
      </span>
    </div>
  );
}

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
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Could not load results</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const scoreBadge = data.score >= 80 ? "success" : data.score >= 60 ? "warning" : "destructive";

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Score summary */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          <div className="text-center">
            <ScoreRing score={data.score} />
            <h1 className="mt-5 text-xl font-bold text-foreground">{data.quizTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.user.name} · {data.user.email}
            </p>

            <div className="mt-6 flex items-center justify-center gap-8">
              <div>
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {data.totalCorrect}/{data.totalQuestions}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Correct</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <Badge variant={scoreBadge} className="text-base font-bold px-3 py-1">
                  {data.score.toFixed(1)}%
                </Badge>
                <p className="text-xs text-muted-foreground mt-0.5">Score</p>
              </div>
            </div>

            <Link to={`/t/${quizSlug}`}>
              <Button className="mt-8">Retake Quiz</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="mx-auto max-w-2xl px-6 pt-8 space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Question Review
        </h2>

        {data.results.map((q, idx) => (
          <div
            key={q.id}
            className={`rounded-xl border bg-card overflow-hidden ${
              q.isCorrect ? "border-emerald-500/30" : "border-destructive/30"
            }`}
          >
            {/* Question header */}
            <div className={`flex items-start gap-3 px-5 py-4 border-b ${
              q.isCorrect
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-destructive/20 bg-destructive/5"
            }`}>
              {q.isCorrect
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                : <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground">Q{idx + 1}</span>
                  {q.domain && (
                    <Badge variant="secondary" className="text-xs">{q.domain}</Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">{q.text}</p>
              </div>
            </div>

            {/* Options */}
            <div className="px-5 py-4 space-y-2">
              {q.options.map((opt) => {
                const wasSelected = q.submittedAnswers.includes(opt.key);
                const isCorrect = q.correctAnswers.includes(opt.key);

                let optCls = "border-border bg-muted/30 text-muted-foreground";
                let keyCls = "border-border text-muted-foreground";

                if (isCorrect && wasSelected) {
                  optCls = "border-emerald-500/50 bg-emerald-500/10 text-foreground";
                  keyCls = "border-emerald-500 bg-emerald-500 text-white";
                } else if (isCorrect) {
                  optCls = "border-emerald-500/30 bg-emerald-500/5 text-foreground";
                  keyCls = "border-emerald-500/50 text-emerald-600 dark:text-emerald-400";
                } else if (wasSelected) {
                  optCls = "border-destructive/50 bg-destructive/10 text-foreground";
                  keyCls = "border-destructive bg-destructive text-white";
                }

                return (
                  <div key={opt.key} className={`rounded-lg border px-4 py-3 ${optCls}`}>
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${keyCls}`}>
                        {opt.key}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed">{opt.text}</p>
                        {opt.explanation && (
                          <p className="mt-1.5 text-xs text-muted-foreground italic">{opt.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall explanation */}
            {q.overallExplanation && (
              <div className="mx-5 mb-4 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Explanation</p>
                <p className="text-sm text-foreground leading-relaxed">{q.overallExplanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
