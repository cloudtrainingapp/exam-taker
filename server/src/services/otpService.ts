import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const BCRYPT_ROUNDS = 6; // Low cost — OTPs are short-lived and 6 digits

export async function generateOtp(
  email: string,
  tenantId: string,
  quizSlug: string
): Promise<string> {
  const recent = await prisma.otpVerification.findFirst({
    where: {
      email,
      tenantId,
      quizSlug,
      usedAt: null,
      expiresAt: { gt: new Date() },
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
  });

  if (recent) {
    throw new RateLimitError("Please wait before requesting another code");
  }

  // Invalidate any previous unused OTPs for this (email, tenant, quiz)
  await prisma.otpVerification.updateMany({
    where: { email, tenantId, quizSlug, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

  await prisma.otpVerification.create({
    data: {
      email,
      tenantId,
      quizSlug,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return code;
}

export async function verifyOtp(
  email: string,
  tenantId: string,
  quizSlug: string,
  code: string
): Promise<boolean> {
  const record = await prisma.otpVerification.findFirst({
    where: {
      email,
      tenantId,
      quizSlug,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;

  const valid = await bcrypt.compare(code, record.codeHash);
  if (!valid) return false;

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return true;
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
