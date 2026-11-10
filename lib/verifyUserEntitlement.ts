// File: lib/verifyUserEntitlement.ts (Backend)
import jwt from "jsonwebtoken";
import { User } from "@/models/User.model";

/**
 * ⚡ GOOGLE PLAY COMPLIANT EARLY ACCESS SWITCH (Backend)
 * When true: All users receive full Pro access (tier 3) to all chapters and assessments.
 */
export const IS_EARLY_ACCESS_FREE = true;

export const normalizeServerTier = (rawPlan: any): number => {
  const num = Number(rawPlan);
  if (!Number.isFinite(num) || num <= 0) return 0;
  if (num === 1) return 1; // BASIC
  if (num === 2) return 2; // STANDARD
  if (num >= 3) return 3; // PRO (maps 3 and legacy 4 to 3)
  return 0;
};

export async function getVerifiedUserAndEntitlement(req: Request) {
  let email: string | null = null;
  let userId: string | null = null;

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token && token !== "undefined" && token !== "null") {
      const rawSecret =
        process.env.JWT_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        "readapt_super_secret_jwt_key_12345";
      const cleanSecret = rawSecret.replace(/["']/g, "").trim();

      for (const secret of [cleanSecret, rawSecret.trim(), "readapt_super_secret_jwt_key_12345"]) {
        try {
          const decoded = jwt.verify(token, secret) as any;
          if (decoded?.email) email = decoded.email;
          if (decoded?._id || decoded?.userId) userId = decoded._id || decoded.userId;
          if (email || userId) break;
        } catch {
          // Try next secret
        }
      }

      // If token verification threw but token has valid base64 payload
      if (!email && !userId && token.includes(".")) {
        try {
          const parts = token.split(".");
          if (parts[1]) {
            const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const decodedPayload = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
            if (decodedPayload?.email) email = decodedPayload.email;
            if (decodedPayload?._id || decodedPayload?.userId) userId = decodedPayload._id || decodedPayload.userId;
          }
        } catch {}
      }
    }
  }

  // Fallback headers
  if (!email) {
    email = req.headers.get("x-user-email") || req.headers.get("X-User-Email");
  }

  if (!email && !userId) {
    return { user: null, effectivePlan: IS_EARLY_ACCESS_FREE ? 3 : 0, isExpired: false };
  }

  const cleanEmail = email ? email.trim() : null;
  const user = cleanEmail
    ? await User.findOne({
        $or: [
          { email: cleanEmail },
          { email: cleanEmail.toLowerCase() },
          { email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        ],
      })
    : await User.findById(userId);

  if (!user) {
    return { user: null, effectivePlan: IS_EARLY_ACCESS_FREE ? 3 : 0, isExpired: false };
  }

  // ⚡ EARLY ACCESS VIP PASS: 100% full features unlocked
  if (IS_EARLY_ACCESS_FREE) {
    return {
      user,
      effectivePlan: 3, // Full Pro
      isExpired: false,
    };
  }

  const rawPlan = normalizeServerTier(user.subscription?.plan);
  const expiresOn = user.subscription?.expiresOn
    ? new Date(user.subscription.expiresOn).getTime()
    : null;

  const now = Date.now();
  const isExpired = rawPlan > 0 && (expiresOn === null || expiresOn <= now);

  // ⚡ AUTO-DOWNGRADE IN DB ON EXPIRY (Preserves progress, likes, questionsAttempted)
  if (isExpired && user.subscription?.plan !== 0) {
    user.subscription = {
      ...user.subscription,
      plan: 0,
      expiresOn: user.subscription.expiresOn,
    };
    await user.save();
  }

  return {
    user,
    effectivePlan: isExpired ? 0 : rawPlan,
    isExpired,
  };
}
