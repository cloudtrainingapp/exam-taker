import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

// Hosts that grant the SUPERADMIN context (prod + local dev variants)
const SUPERADMIN_BARE_HOSTS = new Set([
  "super.quiz.cloudtraining.net",
  "super.quiz.microskill.ai",
  "super.quiz.localhost",
  "super.quiz.local",
]);

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_CUSTOM_DOMAIN = process.env.DEV_CUSTOM_DOMAIN?.toLowerCase();

/** Strip the port suffix and normalise to lowercase. */
function bareHost(raw: string): string {
  return raw.split(":")[0].toLowerCase();
}

/**
 * Extract the subdomain label from a host string.
 * "acme.localhost"          → "acme"
 * "acme.quiz.cloudtraining.net" → "acme"
 * "localhost"               → ""   (no subdomain)
 */
function extractSubdomain(host: string): string {
  const parts = bareHost(host).split(".");
  // A single-label host like "localhost" has no subdomain
  return parts.length > 1 ? parts[0] : "";
}

export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // X-Domain is set by the frontend api client and carries the real browser
  // hostname, which the Vite proxy overwrites in the host header.
  const raw = ((req.headers["x-domain"] as string | undefined) ??
    req.headers.host ??
    req.hostname) as string;
  const bare = bareHost(raw);

  // ------------------------------------------------------------------
  // 1. SUPERADMIN context — prod host or dev equivalents
  // ------------------------------------------------------------------
  if (SUPERADMIN_BARE_HOSTS.has(bare)) {
    req.context = "SUPERADMIN";
    return next();
  }

  // ------------------------------------------------------------------
  // 2. Dev custom-domain simulation
  //    companydomain.local (or whatever DEV_CUSTOM_DOMAIN is set to)
  //    is treated as a customDomain lookup against the DB.
  // ------------------------------------------------------------------
  if (IS_DEV && DEV_CUSTOM_DOMAIN && bare === DEV_CUSTOM_DOMAIN) {
    const tenant = await prisma.tenant.findFirst({
      where: { customDomain: DEV_CUSTOM_DOMAIN },
    });

    if (!tenant) {
      res.status(404).json({ error: "Domain configuration missing" });
      return;
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;
    return next();
  }

  // ------------------------------------------------------------------
  // 3. Standard resolution — subdomain prefix OR exact customDomain
  //    Works for both:
  //      dev  → acme.localhost:5173
  //      prod → acme.quiz.cloudtraining.net
  // ------------------------------------------------------------------
  const subdomain = extractSubdomain(raw);

  if (!subdomain) {
    // Bare localhost with no subdomain and not a custom domain — not a tenant
    res.status(404).json({ error: "Domain configuration missing" });
    return;
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ subdomain }, { customDomain: bare }],
    },
  });

  if (!tenant) {
    res.status(404).json({ error: "Domain configuration missing" });
    return;
  }

  req.tenant = tenant;
  req.tenantId = tenant.id;
  next();
}
