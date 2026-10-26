// File: lib/verifyUserEntitlement.ts (Backend)
import jwt from "jsonwebtoken";
import { User } from "@/models/User.model";

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

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const jwtSecret =
      process.env.JWT_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "readapt_super_secret_jwt_key_12345";
    try {
      const decoded = jwt.verify(token, jwtSecret.trim()) as any;
      email = decoded?.email || null;
      userId = decoded?._id || null;
    } catch {
      // Invalid JWT
    }
  }

  // Fallback header if used by internal proxy
  if (!email) {
    email = req.headers.get("x-user-email");
  }

  if (!email && !userId) {
    return { user: null, effectivePlan: 0, isExpired: false };
  }

  const user = email
    ? await User.findOne({ email })
    : await User.findById(userId);

  if (!user) {
    return { user: null, effectivePlan: 0, isExpired: false };
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
