import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export interface AuthenticatedUser {
  email: string;
  userId?: string;
  name?: string;
}

const DEFAULT_DEV_JWT_SECRET = "readapt_super_secret_jwt_key_12345";

function normalizeSecret(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

/**
 * Canonical JWT signing secret used by login & token verification.
 */
export function getJwtSigningSecret(): string {
  return (
    normalizeSecret(process.env.JWT_SECRET) ||
    normalizeSecret(process.env.NEXTAUTH_SECRET) ||
    DEFAULT_DEV_JWT_SECRET
  );
}

/**
 * Candidate verification secrets to tolerate env quote formatting differences cleanly.
 */
export function getJwtVerifySecrets(): string[] {
  const candidates = new Set<string>();
  const primary = getJwtSigningSecret();
  if (primary) candidates.add(primary);

  const rawJwt = process.env.JWT_SECRET?.trim();
  const rawNextAuth = process.env.NEXTAUTH_SECRET?.trim();
  if (rawJwt) candidates.add(rawJwt);
  if (rawNextAuth) candidates.add(rawNextAuth);
  candidates.add(DEFAULT_DEV_JWT_SECRET);

  return Array.from(candidates);
}

/**
 * Extracts and cryptographically verifies the authenticated user from the Request.
 * Prioritizes Bearer JWT header.
 * Rejects untrusted raw x-user-email headers in production.
 */
export async function getAuthenticatedUser(
  req: NextRequest | Request
): Promise<AuthenticatedUser | null> {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token && token !== "undefined" && token !== "null") {
      const secrets = getJwtVerifySecrets();
      for (const secretStr of secrets) {
        try {
          const secret = new TextEncoder().encode(secretStr);
          const { payload } = await jwtVerify(token, secret);
          const email = ((payload as any)?.email ||
            (payload as any)?.user?.email ||
            null) as string | null;

          if (email && typeof email === "string") {
            return {
              email: email.toLowerCase().trim(),
              userId: (payload as any)?._id || (payload as any)?.userId,
              name: (payload as any)?.name,
            };
          }
        } catch {
          // Try next normalized candidate
        }
      }
    }
  }

  // Controlled fallback for local development or explicit dev testing
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_DEV_HEADERS === "true"
  ) {
    const devEmail = req.headers.get("x-user-email");
    if (devEmail) {
      return {
        email: devEmail.toLowerCase().trim(),
      };
    }
  }

  return null;
}

// Lightweight in-memory sliding-window rate limiter per warm lambda instance
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 15,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Prevent unbounded memory growth on long-lived containers
  if (rateLimitStore.size > 2000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt <= now) rateLimitStore.delete(k);
    }
  }

  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim() || "unknown";
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
