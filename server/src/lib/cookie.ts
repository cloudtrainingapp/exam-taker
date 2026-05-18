import { CookieOptions } from "express";

const IS_PROD = process.env.NODE_ENV === "production";

export function cookieOptions(host?: string): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    // In dev, omit Domain so the browser scopes the cookie to the exact
    // origin — this lets *.localhost subdomains each carry their own cookie
    // without cross-contamination. In prod, lock to the root domain.
    domain: IS_PROD ? process.env.CENTRAL_DOMAIN : undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}
