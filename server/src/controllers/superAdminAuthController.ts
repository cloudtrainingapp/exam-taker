import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not configured");
  return s;
}

export async function superAdminLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as Record<string, unknown>;

  if (typeof email !== "string" || !email || typeof password !== "string" || !password) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Email and password are required" } });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), userType: "SUPERADMIN" },
  });

  // Always run compare to prevent timing-based user enumeration
  const dummyHash = "$2a$12$invalidhashpadding000000000000000000000000000000000000000";
  const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (!user || !valid) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: "SUPERADMIN" },
    jwtSecret(),
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
}
