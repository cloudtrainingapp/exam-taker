import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  const progressPercent = totalQ > 0 ? ((current + 1) / totalQ) * 100 : 0;

  if (metaError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground mb-2">Quiz not found</p>
          <p className="text-sm text-muted-foreground">{metaError}</p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (stage === "register") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">
              {meta.totalQuestionsToDisplay} questions
              {meta.questionCount > meta.totalQuestionsToDisplay
                ? ` · randomly selected from ${meta.questionCount}`
                : ""}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enter your details to begin</CardTitle>
              <CardDescription>Your results will be saved to this profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStart} className="space-y-4">
                {startError && (
                  <Alert variant="destructive">
                    <AlertDescription>{startError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
                </div>
                <Button type="submit" className="w-full mt-2">Start Quiz</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "submitting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Submitting your answers…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">{meta.title}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {answeredCount} / {totalQ} answered
              </span>
              <ThemeToggle />
            </div>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          <p className="mt-1.5 text-xs text-muted-foreground">Question {current + 1} of {totalQ}</p>
        </div>
      </header>

      {/* Question body */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <Badge variant={q.type === "MULTIPLE_CHOICE" ? "secondary" : "default"} className="mb-4">
            {q.type === "MULTIPLE_CHOICE" ? "Single answer" : "Select all that apply"}
          </Badge>

          <h2 className="text-lg font-semibold text-foreground leading-snug mb-6">{q.text}</h2>

          <div className="space-y-3">
            {q.options.map((opt) => {
              const selected = currentAnswers.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleAnswer(q.id, opt.key, q.type)}
                  className={`w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-border/80 hover:bg-accent"
                  }`}
                >
                  <span className={`mt-0.5 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                  }`}>
                    {opt.key}
                  </span>
                  <span className={`text-sm leading-relaxed ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                    {opt.text}
                  </span>
                  <span className="ml-auto flex-shrink-0 mt-0.5">
                    {selected
                      ? <CheckCircle2 className="h-4 w-4 text-primary" />
                      : <Circle className="h-4 w-4 text-muted-foreground/40" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Navigation footer */}
      <footer className="border-t border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>

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
                      ? "h-2.5 w-2.5 bg-primary"
                      : answered
                      ? "h-2 w-2 bg-primary/60"
                      : "h-2 w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  title={`Question ${i + 1}${answered ? " (answered)" : ""}`}
                />
              );
            })}
          </div>

          {isLast ? (
            <Button onClick={handleSubmit}>Submit Quiz</Button>
          ) : (
            <Button onClick={() => setCurrent((c) => Math.min(totalQ - 1, c + 1))}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
