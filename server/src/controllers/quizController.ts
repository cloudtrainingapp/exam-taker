import { Request, Response } from "express";
import prisma from "../lib/prisma";

function toSlug(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "quiz";
}

async function uniqueSlug(tenantId: string, base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 1;
  while (true) {
    const existing = await prisma.quiz.findFirst({
      where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (!existing) return slug;
    slug = `${base}-${++i}`;
  }
}

export async function listQuizzes(req: Request, res: Response): Promise<void> {
  const quizzes = await prisma.quiz.findMany({
    where: { tenantId: req.tenantId! },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });
  res.json(quizzes);
}

export async function createQuiz(req: Request, res: Response): Promise<void> {
  const { title, totalQuestionsToDisplay } = req.body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title is required" } });
    return;
  }

  const total = Number(totalQuestionsToDisplay);
  if (!Number.isInteger(total) || total < 1) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "totalQuestionsToDisplay must be a positive integer" } });
    return;
  }

  const slug = await uniqueSlug(req.tenantId!, toSlug(title));

  const quiz = await prisma.quiz.create({
    data: { tenantId: req.tenantId!, title: title.trim(), slug, totalQuestionsToDisplay: total },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  res.status(201).json(quiz);
}

export async function getQuiz(req: Request, res: Response): Promise<void> {
  const quizId = req.params["quizId"] as string;

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, tenantId: req.tenantId! },
    include: {
      _count: { select: { attempts: true } },
      questions: { orderBy: { id: "asc" } },
    },
  });

  if (!quiz) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Quiz not found" } });
    return;
  }

  res.json(quiz);
}

export async function updateQuiz(req: Request, res: Response): Promise<void> {
  const quizId = req.params["quizId"] as string;
  const { title, totalQuestionsToDisplay } = req.body as Record<string, unknown>;

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, tenantId: req.tenantId! } });
  if (!quiz) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Quiz not found" } });
    return;
  }

  const newTitle = typeof title === "string" && title.trim() ? title.trim() : undefined;
  const newTotal = totalQuestionsToDisplay !== undefined ? Number(totalQuestionsToDisplay) : undefined;

  if (newTotal !== undefined && (!Number.isInteger(newTotal) || newTotal < 1)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "totalQuestionsToDisplay must be a positive integer" } });
    return;
  }

  const slug = newTitle ? await uniqueSlug(req.tenantId!, toSlug(newTitle), quizId) : undefined;

  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(newTitle ? { title: newTitle, slug } : {}),
      ...(newTotal !== undefined ? { totalQuestionsToDisplay: newTotal } : {}),
    },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  res.json(updated);
}

export async function deleteQuiz(req: Request, res: Response): Promise<void> {
  const quizId = req.params["quizId"] as string;

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, tenantId: req.tenantId! } });
  if (!quiz) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Quiz not found" } });
    return;
  }

  await prisma.quiz.delete({ where: { id: quizId } });
  res.status(204).send();
}
