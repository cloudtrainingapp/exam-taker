import { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;

  const [tenant, quizCount, questionCount, attemptCount, scoreAggregate, recentAttempts] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, subdomain: true } }),
      prisma.quiz.count({ where: { tenantId } }),
      prisma.question.count({ where: { quiz: { tenantId } } }),
      prisma.attempt.count({ where: { tenantId } }),
      prisma.attempt.aggregate({ where: { tenantId }, _avg: { score: true } }),
      prisma.attempt.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          slug: true,
          score: true,
          totalCorrect: true,
          totalQuestions: true,
          createdAt: true,
          quiz: { select: { title: true, slug: true } },
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

  res.json({
    tenant,
    stats: {
      quizCount,
      questionCount,
      attemptCount,
      avgScore: scoreAggregate._avg.score ?? 0,
    },
    recentAttempts,
  });
}

export async function listAttempts(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const PAGE_SIZE = 25;

  const page   = Math.max(1, parseInt(req.query["page"]   as string) || 1);
  const quizId = (req.query["quizId"] as string) || undefined;
  const search = (req.query["search"] as string)?.trim() || undefined;

  const where = {
    tenantId,
    submittedAt: { not: null },
    ...(quizId ? { quizId } : {}),
    ...(search
      ? {
          OR: [
            { user: { name:  { contains: search, mode: "insensitive" as const } } },
            { user: { email: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, attempts, quizzes] = await Promise.all([
    prisma.attempt.count({ where }),
    prisma.attempt.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        score: true,
        totalCorrect: true,
        totalQuestions: true,
        submittedAt: true,
        quiz: { select: { id: true, title: true, slug: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.quiz.findMany({
      where: { tenantId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  res.json({
    attempts,
    quizzes,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  });
}
