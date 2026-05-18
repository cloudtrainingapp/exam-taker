import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { sendVerificationEmail } from "../services/emailService";

function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not configured");
  return s;
}

function buildVerifyUrl(subdomain: string, token: string): string {
  const central = process.env.CENTRAL_DOMAIN ?? "localhost:5173";
  const isProd = process.env.NODE_ENV === "production";
  const proto = isProd ? "https" : "http";
  return `${proto}://${subdomain}.${central}/verify?token=${encodeURIComponent(token)}`;
}

export async function adminSignup(req: Request, res: Response): Promise<void> {
  const { name, email, password, subdomain } = req.body as Record<string, unknown>;

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof password !== "string" || password.length < 8 ||
    typeof subdomain !== "string" || !subdomain.trim()
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "name, email, subdomain, and password (min 8 chars) are required",
      },
    });
    return;
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Subdomain may only contain lowercase letters, numbers, and hyphens",
      },
    });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const [takenSubdomain, takenEmail] = await Promise.all([
    prisma.tenant.findUnique({ where: { subdomain } }),
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
  ]);

  if (takenSubdomain) {
    res.status(409).json({ error: { code: "SUBDOMAIN_TAKEN", message: "That subdomain is already taken" } });
    return;
  }
  if (takenEmail) {
    res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "An account with this email already exists" } });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { user, tenant } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: subdomain,
        subdomain,
        supportEmail: normalizedEmail,
        sendEmailToggle: true,
      },
    });
    const user = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        userType: "ADMIN",
        isVerified: false,
        tenantId: tenant.id,
      },
    });
    return { user, tenant };
  });

  const verificationToken = jwt.sign(
    { sub: user.id, purpose: "email-verification", tenantId: tenant.id },
    jwtSecret(),
    { expiresIn: "24h" }
  );

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verifyUrl: buildVerifyUrl(subdomain, verificationToken),
    tenantSubdomain: subdomain,
  });

  res.status(201).json({
    message: "Account created. Check your email to activate your admin account.",
  });
}

export async function adminVerify(req: Request, res: Response): Promise<void> {
  const { token } = req.body as { token?: unknown };

  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Verification token is required" } });
    return;
  }

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, jwtSecret()) as jwt.JwtPayload;
  } catch {
    res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Token is invalid or has expired" } });
    return;
  }

  if (payload.purpose !== "email-verification") {
    res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Token is invalid or has expired" } });
    return;
  }

  // When the user clicks the link on their subdomain, tenantId must match
  if (req.tenantId && payload.tenantId !== req.tenantId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Token does not match this workspace" } });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub as string, userType: "ADMIN", tenantId: payload.tenantId as string },
  });

  if (!user) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Account not found" } });
    return;
  }

  if (user.isVerified) {
    res.json({ message: "Account is already verified. You can log in." });
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });

  res.json({ message: "Email verified successfully. You can now log in." });
}

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as Record<string, unknown>;

  if (typeof email !== "string" || !email || typeof password !== "string" || !password) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required" } });
    return;
  }

  if (!req.tenantId) {
    res.status(400).json({ error: { code: "NO_TENANT", message: "No workspace found for this domain" } });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), userType: "ADMIN", tenantId: req.tenantId },
  });

  // Constant-time path: always compare even when user is null to prevent timing attacks
  const dummyHash = "$2a$12$invalidhashpadding000000000000000000000000000000000000000";
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (!user || !valid) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } });
    return;
  }

  if (!user.isVerified) {
    res.status(403).json({ error: { code: "NOT_VERIFIED", message: "Verify your email before logging in" } });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: "ADMIN", tenantId: user.tenantId },
    jwtSecret(),
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId },
  });
}
