import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const [tenantCount, adminCount, quizCount, attemptCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count({ where: { userType: "ADMIN" } }),
    prisma.quiz.count(),
    prisma.attempt.count(),
  ]);

  res.json({ tenantCount, adminCount, quizCount, attemptCount });
}

export async function listTenants(_req: Request, res: Response): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, quizzes: true, attempts: true } },
    },
  });

  res.json(tenants);
}

export async function createTenant(req: Request, res: Response): Promise<void> {
  const { name, subdomain, supportEmail, adminName, adminEmail } = req.body as Record<string, unknown>;

  if (
    typeof name !== "string" || !name.trim() ||
    typeof subdomain !== "string" || !subdomain.trim() ||
    typeof supportEmail !== "string" || !supportEmail.trim() ||
    typeof adminName !== "string" || !adminName.trim() ||
    typeof adminEmail !== "string" || !adminEmail.trim()
  ) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "name, subdomain, supportEmail, adminName, and adminEmail are required" },
    });
    return;
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Subdomain may only contain lowercase letters, numbers, and hyphens" },
    });
    return;
  }

  const normalizedAdminEmail = adminEmail.toLowerCase().trim();

  const [existingTenant, existingEmail] = await Promise.all([
    prisma.tenant.findUnique({ where: { subdomain } }),
    prisma.user.findUnique({ where: { email: normalizedAdminEmail } }),
  ]);

  if (existingTenant) {
    res.status(409).json({ error: { code: "SUBDOMAIN_TAKEN", message: "That subdomain is already taken" } });
    return;
  }
  if (existingEmail) {
    res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "That admin email is already registered" } });
    return;
  }

  // Generate a random one-time password — shown once in the response
  const tempPassword = crypto.randomBytes(10).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const { tenant } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: name.trim(),
        subdomain,
        supportEmail: supportEmail.toLowerCase().trim(),
        sendEmailToggle: true,
      },
      include: { _count: { select: { users: true, quizzes: true, attempts: true } } },
    });

    await tx.user.create({
      data: {
        name: adminName.trim(),
        email: normalizedAdminEmail,
        passwordHash,
        userType: "ADMIN",
        isVerified: true, // provisioned by superadmin — no email verification step
        tenantId: tenant.id,
      },
    });

    return { tenant };
  });

  res.status(201).json({ tenant, tempPassword });
}

export async function getTenant(req: Request, res: Response): Promise<void> {
  const id = req.params["id"] as string;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, quizzes: true, attempts: true } },
      users: { where: { userType: "ADMIN" }, select: { id: true, name: true, email: true, isVerified: true, createdAt: true } },
    },
  });

  if (!tenant) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Tenant not found" } });
    return;
  }

  res.json(tenant);
}

export async function updateTenant(req: Request, res: Response): Promise<void> {
  const id = req.params["id"] as string;
  const { name, supportEmail, customDomain, isDomainVerified, sendEmailToggle } = req.body as Record<string, unknown>;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Tenant not found" } });
    return;
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(typeof supportEmail === "string" ? { supportEmail: supportEmail.toLowerCase().trim() } : {}),
      ...(typeof customDomain === "string" ? { customDomain: customDomain.trim() || null } : {}),
      ...(typeof isDomainVerified === "boolean" ? { isDomainVerified } : {}),
      ...(typeof sendEmailToggle === "boolean" ? { sendEmailToggle } : {}),
    },
    include: { _count: { select: { users: true, quizzes: true, attempts: true } } },
  });

  res.json(updated);
}

export async function deleteTenant(req: Request, res: Response): Promise<void> {
  const id = req.params["id"] as string;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Tenant not found" } });
    return;
  }

  await prisma.tenant.delete({ where: { id } });
  res.status(204).send();
}
