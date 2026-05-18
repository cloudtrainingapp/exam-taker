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
