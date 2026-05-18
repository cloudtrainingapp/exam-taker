import { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbQuestion {
  id: string;
  text: string;
  type: string;
  option1: string | null; option2: string | null; option3: string | null;
  option4: string | null; option5: string | null; option6: string | null;
  explanation1: string | null; explanation2: string | null; explanation3: string | null;
  explanation4: string | null; explanation5: string | null; explanation6: string | null;
  correctAnswers: string;
  overallExplanation: string;
  domain: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OPTION_KEYS = ["option1","option2","option3","option4","option5","option6"] as const;
const EXPL_KEYS   = ["explanation1","explanation2","explanation3","explanation4","explanation5","explanation6"] as const;

function optionLabel(i: number) { return String.fromCharCode(65 + i); }

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toPublicOptions(q: DbQuestion) {
  return OPTION_KEYS
    .map((k, i) => q[k] ? { key: optionLabel(i), text: q[k]! } : null)
    .filter((o): o is { key: string; text: string } => o !== null);
}

function scoreQuestion(q: DbQuestion, submitted: string[]): boolean {
  const correct = q.correctAnswers.split(",").map((a) => a.trim().toUpperCase()).sort();
  const given   = submitted.map((a) => a.trim().toUpperCase()).sort();
  return given.length === correct.length && given.every((v, i) => v === correct[i]);
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function getQuizInfo(req: Request, res: Response): Promise<void> {
  const slug = req.params["slug"] as string;

  const quiz = await prisma.quiz.findFirst({
    where: { tenantId: req.tenantId!, slug },
    include: { _count: { select: { questions: true } } },
  });

  if (!quiz) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Quiz not found" } });
    return;
  }

  res.json({
    title: quiz.title,
    slug: quiz.slug,
    totalQuestionsToDisplay: quiz.totalQuestionsToDisplay,
    questionCount: quiz._count.questions,
  });
}

export async function startAttempt(req: Request, res: Response): Promise<void> {
  const slug = req.params["slug"] as string;
  const { name, email } = req.body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name is required" } });
    return;
  }
  if (typeof email !== "string" || !email.trim()) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "email is required" } });
    return;
  }

  const quiz = await prisma.quiz.findFirst({
    where: { tenantId: req.tenantId!, slug },
    include: {
      questions: {
        select: {
          id: true, text: true, type: true,
          option1: true, option2: true, option3: true,
          option4: true, option5: true, option6: true,
        },
      },
    },
  });

  if (!quiz) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Quiz not found" } });
    return;
  }

  if (quiz.questions.length === 0) {
    res.status(400).json({ error: { code: "NO_QUESTIONS", message: "This quiz has no questions yet" } });
    return;
  }

  const shuffled = shuffleArray(quiz.questions);
  const selected = shuffled.slice(0, Math.min(quiz.totalQuestionsToDisplay, shuffled.length));

  const normalizedEmail = email.trim().toLowerCase();
  let user = await prisma.user.findFirst({
    where: { email: normalizedEmail, tenantId: req.tenantId! },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        userType: "USER",
        isVerified: true,
        tenantId: req.tenantId!,
      },
    });
  }

  const attemptSlug = crypto.randomBytes(8).toString("hex");
  await prisma.attempt.create({
    data: {
      userId: user.id,
      quizId: quiz.id,
      tenantId: req.tenantId!,
      slug: attemptSlug,
      totalQuestions: selected.length,
      questionIds: selected.map((q) => q.id),
      answers: {},
    },
  });

  const questions = selected.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: toPublicOptions(q as DbQuestion),
  }));

  res.status(201).json({ attemptSlug, questions });
}

export async function submitAttempt(req: Request, res: Response): Promise<void> {
  const slug        = req.params["slug"] as string;
  const attemptSlug = req.params["attemptSlug"] as string;
  const { answers } = req.body as { answers: Record<string, string[]> };

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "answers must be an object" } });
    return;
  }

  const attempt = await prisma.attempt.findFirst({
    where: { slug: attemptSlug, tenantId: req.tenantId! },
    include: { quiz: { select: { slug: true } } },
  });

  if (!attempt || attempt.quiz.slug !== slug) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Attempt not found" } });
    return;
  }

  const questionIds = attempt.questionIds as string[];
  const questions   = await prisma.question.findMany({ where: { id: { in: questionIds } } });
  const questionMap = new Map(questions.map((q) => [q.id, q as unknown as DbQuestion]));

  let totalCorrect = 0;
  for (const qId of questionIds) {
    const q = questionMap.get(qId);
    if (q && scoreQuestion(q, answers[qId] ?? [])) totalCorrect++;
  }

  const score = questionIds.length > 0 ? (totalCorrect / questionIds.length) * 100 : 0;

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: { answers, score, totalCorrect, totalQuestions: questionIds.length, submittedAt: new Date() },
  });

  res.json({ attemptSlug, score, totalCorrect, totalQuestions: questionIds.length });
}

export async function getAttemptResults(req: Request, res: Response): Promise<void> {
  const slug        = req.params["slug"] as string;
  const attemptSlug = req.params["attemptSlug"] as string;

  const attempt = await prisma.attempt.findFirst({
    where: { slug: attemptSlug, tenantId: req.tenantId! },
    include: {
      quiz:  { select: { slug: true, title: true } },
      user:  { select: { name: true, email: true } },
    },
  });

  if (!attempt || attempt.quiz.slug !== slug) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Attempt not found" } });
    return;
  }

  if (!attempt.submittedAt) {
    res.status(400).json({ error: { code: "NOT_SUBMITTED", message: "Attempt not yet submitted" } });
    return;
  }

  const questionIds = attempt.questionIds as string[];
  const questions   = await prisma.question.findMany({ where: { id: { in: questionIds } } });
  const questionMap = new Map(questions.map((q) => [q.id, q as unknown as DbQuestion]));
  const answers     = attempt.answers as Record<string, string[]>;

  const results = questionIds.map((qId) => {
    const q       = questionMap.get(qId)!;
    const submitted = answers[qId] ?? [];
    const correct   = q.correctAnswers.split(",").map((a) => a.trim().toUpperCase());
    const isCorrect = scoreQuestion(q, submitted);

    const options = OPTION_KEYS
      .map((k, i) =>
        q[k] ? { key: optionLabel(i), text: q[k]!, explanation: q[EXPL_KEYS[i]] ?? null } : null
      )
      .filter((o): o is NonNullable<typeof o> => o !== null);

    return {
      id: q.id,
      text: q.text,
      type: q.type,
      options,
      correctAnswers: correct,
      submittedAnswers: submitted.map((a) => a.trim().toUpperCase()),
      isCorrect,
      overallExplanation: q.overallExplanation || null,
      domain: q.domain,
    };
  });

  res.json({
    attemptSlug,
    quizTitle: attempt.quiz.title,
    user: attempt.user,
    score: attempt.score,
    totalCorrect: attempt.totalCorrect,
    totalQuestions: attempt.totalQuestions,
    submittedAt: attempt.submittedAt,
    results,
  });
}
