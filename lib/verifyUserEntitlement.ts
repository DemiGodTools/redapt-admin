// File: lib/verifyUserEntitlement.ts (Backend)
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { User } from "@/models/User.model";
import { getJwtVerifySecrets } from "@/lib/userAuth";

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
      const secrets = getJwtVerifySecrets();
      for (const secret of secrets) {
        try {
          const decoded = jwt.verify(token, secret) as any;
          const decodedEmail = decoded?.email || decoded?.user?.email;
          if (decodedEmail && typeof decodedEmail === "string") {
            email = decodedEmail;
          }
          const decodedId = decoded?._id || decoded?.userId || decoded?.user?._id;
          if (decodedId && typeof decodedId === "string") {
            userId = decodedId;
          }
          if (email || userId) break;
        } catch {
          // Try next normalized secret
        }
      }
    }
  }

  // Strictly restrict x-user-email fallback to non-production / explicit dev flag
  if (
    !email &&
    !userId &&
    (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_HEADERS === "true")
  ) {
    email = req.headers.get("x-user-email") || req.headers.get("X-User-Email");
  }

  if (!email && !userId) {
    return { user: null, effectivePlan: IS_EARLY_ACCESS_FREE ? 3 : 0, isExpired: false };
  }

  let user: any = null;
  const userProjection =
    "_id name userId email image imageMd imageSm profileLevel subscription";

  // Prefer O(1) indexed _id lookup when JWT carries a valid Mongo ObjectId
  if (userId && Types.ObjectId.isValid(userId)) {
    try {
      user = await User.findById(userId).select(userProjection).lean();
    } catch {}
  }

  if (!user && email) {
    const cleanEmail = email.trim();
    const lowerEmail = cleanEmail.toLowerCase();
    user = await User.findOne({
      email: { $in: Array.from(new Set([cleanEmail, lowerEmail])) },
    })
      .select(userProjection)
      .lean();
  }

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
    await User.updateOne(
      { _id: user._id },
      { $set: { "subscription.plan": 0 } }
    );
  }

  return {
    user,
    effectivePlan: isExpired ? 0 : rawPlan,
    isExpired,
  };
}
