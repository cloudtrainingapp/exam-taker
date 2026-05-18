import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }

  const token = authHeader.slice(7);

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
  } catch {
    res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token is invalid or expired" } });
    return;
  }

  if (payload.role !== "ADMIN") {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required" } });
    return;
  }

  if (payload.tenantId !== req.tenantId) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Token does not match this workspace" } });
    return;
  }

  req.user = {
    id: payload.sub as string,
    email: payload.email as string,
    role: payload.role as string,
    tenantId: payload.tenantId as string,
  };

  next();
}
