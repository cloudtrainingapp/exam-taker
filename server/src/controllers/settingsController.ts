import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

export async function getSettings(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const userId   = req.user!.id;

  const [tenant, user] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        subdomain: true,
        customDomain: true,
        isDomainVerified: true,
        supportEmail: true,
        emailSubject: true,
        emailTemplate: true,
        sendEmailToggle: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);

  if (!tenant || !user) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Settings not found" } });
    return;
  }

  res.json({ tenant, user });
}

export async function updateWorkspace(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const { name, customDomain } = req.body as Record<string, unknown>;

  const patch: Record<string, unknown> = {};

  if (typeof name === "string") {
    if (!name.trim()) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Workspace name cannot be empty" } });
      return;
    }
    patch.name = name.trim();
  }

  if (customDomain !== undefined) {
    if (customDomain === null || customDomain === "") {
      patch.customDomain = null;
      patch.isDomainVerified = false;
    } else if (typeof customDomain === "string") {
      const domain = customDomain.trim().toLowerCase();
      // Basic domain format check
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid domain format" } });
        return;
      }
      // Ensure not already taken by another tenant
      const existing = await prisma.tenant.findFirst({
        where: { customDomain: domain, NOT: { id: tenantId } },
      });
      if (existing) {
        res.status(409).json({ error: { code: "CONFLICT", message: "Domain already in use" } });
        return;
      }
      patch.customDomain = domain;
      patch.isDomainVerified = false;
    }
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No fields to update" } });
    return;
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: patch,
    select: {
      name: true,
      subdomain: true,
      customDomain: true,
      isDomainVerified: true,
    },
  });

  res.json(updated);
}

export async function updateEmail(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const { supportEmail, emailSubject, emailTemplate, sendEmailToggle } = req.body as Record<string, unknown>;

  const patch: Record<string, unknown> = {};

  if (typeof supportEmail === "string") {
    if (!supportEmail.trim()) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Support email cannot be empty" } });
      return;
    }
    patch.supportEmail = supportEmail.trim();
  }

  if (typeof emailSubject === "string") patch.emailSubject = emailSubject.trim() || null;
  if (typeof emailTemplate === "string") patch.emailTemplate = emailTemplate.trim() || null;
  if (typeof sendEmailToggle === "boolean") patch.sendEmailToggle = sendEmailToggle;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No fields to update" } });
    return;
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: patch,
    select: { supportEmail: true, emailSubject: true, emailTemplate: true, sendEmailToggle: true },
  });

  res.json(updated);
}

export async function updatePassword(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body as Record<string, unknown>;

  if (typeof currentPassword !== "string" || !currentPassword) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "currentPassword is required" } });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "newPassword must be at least 8 characters" } });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash) {
    res.status(400).json({ error: { code: "NO_PASSWORD", message: "No password set on this account" } });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: { code: "INVALID_PASSWORD", message: "Current password is incorrect" } });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });

  res.json({ ok: true });
}
