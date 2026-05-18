import { Request, Response } from "express";
import { QuestionType } from "@prisma/client";
import prisma from "../lib/prisma";

const VALID_TYPES = new Set<string>(["MULTIPLE_CHOICE", "MULTI_SELECT"]);

interface QuestionInput {
  text?: unknown;
  type?: unknown;
  option1?: unknown; option2?: unknown; option3?: unknown;
  option4?: unknown; option5?: unknown; option6?: unknown;
  explanation1?: unknown; explanation2?: unknown; explanation3?: unknown;
  explanation4?: unknown; explanation5?: unknown; explanation6?: unknown;
  correctAnswers?: unknown;
  overallExplanation?: unknown;
  domain?: unknown;
}

function parseQuestion(body: QuestionInput, requireAll = true) {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
  const correctAnswers = typeof body.correctAnswers === "string" ? body.correctAnswers.trim() : "";
  const overallExplanation = typeof body.overallExplanation === "string" ? body.overallExplanation.trim() : "";

  if (requireAll) {
    if (!text) return { error: "text is required" };
    if (!VALID_TYPES.has(type)) return { error: "type must be MULTIPLE_CHOICE or MULTI_SELECT" };
    if (!correctAnswers) return { error: "correctAnswers is required" };
  }

  function str(v: unknown) { return typeof v === "string" ? v.trim() || null : null; }

  return {
    data: {
      text,
      type: type as QuestionType,
      option1: str(body.option1), option2: str(body.option2), option3: str(body.option3),
      option4: str(body.option4), option5: str(body.option5), option6: str(body.option6),
      explanation1: str(body.explanation1), explanation2: str(body.explanation2),
      explanation3: str(body.explanation3), explanation4: str(body.explanation4),
      explanation5: str(body.explanation5), explanation6: str(body.explanation6),
      correctAnswers,
      overallExplanation,
      domain: str(body.domain),
    },
  };
}

async function assertQuizOwnership(quizId: string, tenantId: string) {
  return prisma.quiz.findFirst({ where: { id: quizId, tenantId } });
}

async function assertQuestionOwnership(questionId: string, tenantId: string) {
  return prisma.question.findFirst({
    where: { id: questionId, quiz: { tenantId } },
  });
}

export async function createQuestion(req: Request, res: Response): Promise<void> {
  const quizId = req.params["quizId"] as string;

  const quiz = await assertQuizOwnership(quizId, req.tenantId!);
  if (!quiz) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Quiz not found" } });
    return;
  }

  const result = parseQuestion(req.body as QuestionInput);
  if ("error" in result) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: result.error } });
    return;
  }

  const question = await prisma.question.create({ data: { quizId, ...result.data } });
  res.status(201).json(question);
}

export async function bulkCreateQuestions(req: Request, res: Response): Promise<void> {
  const quizId = req.params["quizId"] as string;

  const quiz = await assertQuizOwnership(quizId, req.tenantId!);
  if (!quiz) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Quiz not found" } });
    return;
  }

  const rows = req.body as unknown[];
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a non-empty array of questions" } });
    return;
  }

  const parsed: ReturnType<typeof parseQuestion>[] = rows.map((r) => parseQuestion(r as QuestionInput));
  const invalid = parsed.findIndex((p) => "error" in p);
  if (invalid !== -1) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: `Row ${invalid + 1}: ${"error" in parsed[invalid] ? (parsed[invalid] as { error: string }).error : ""}` },
    });
    return;
  }

  await prisma.question.createMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: parsed.map((p) => ({ quizId, ...(p as any).data })) as any,
  });

  const count = parsed.length;
  res.status(201).json({ imported: count });
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  const questionId = req.params["questionId"] as string;

  const question = await assertQuestionOwnership(questionId, req.tenantId!);
  if (!question) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Question not found" } });
    return;
  }

  const result = parseQuestion(req.body as QuestionInput, false);
  if ("error" in result) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: result.error } });
    return;
  }

  // Only apply fields that were actually sent
  const body = req.body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const fields = ["text","type","option1","option2","option3","option4","option5","option6",
    "explanation1","explanation2","explanation3","explanation4","explanation5","explanation6",
    "correctAnswers","overallExplanation","domain"] as const;

  for (const field of fields) {
    if (field in body) patch[field] = (result.data as Record<string, unknown>)[field];
  }
  if (patch.type) patch.type = (patch.type as string).toUpperCase();

  const updated = await prisma.question.update({ where: { id: questionId }, data: patch });
  res.json(updated);
}

export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  const questionId = req.params["questionId"] as string;

  const question = await assertQuestionOwnership(questionId, req.tenantId!);
  if (!question) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Question not found" } });
    return;
  }

  await prisma.question.delete({ where: { id: questionId } });
  res.status(204).send();
}
