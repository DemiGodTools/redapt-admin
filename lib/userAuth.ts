import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export interface AuthenticatedUser {
  email: string;
  userId?: string;
  name?: string;
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
      try {
        const rawSecret =
          process.env.JWT_SECRET ||
          process.env.NEXTAUTH_SECRET ||
          "readapt_super_secret_jwt_key_12345";
        const secret = new TextEncoder().encode(rawSecret.trim());
        const { payload } = await jwtVerify(token, secret);
        const email = ((payload as any)?.email ||
          (payload as any)?.user?.email ||
          null) as string | null;

        if (email) {
          return {
            email: email.toLowerCase().trim(),
            userId: (payload as any)?._id || (payload as any)?.userId,
            name: (payload as any)?.name,
          };
        }
      } catch {}
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
