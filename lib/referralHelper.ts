// lib/referralHelper.ts
import { User } from "@/models/User.model";

// Ambiguous characters (0, O, 1, I, L) removed for crystal-clear readability
const ALPHANUMERIC_SAFE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generates a clean, human-friendly 6-8 character referral code.
 * Example: RD + 5 characters -> "RD7K92M" or initials + chars -> "AMAN84P"
 */
export function generateCandidateReferralCode(userOrHandle?: any): string {
  let uId = "";
  let uName = "";
  let uEmail = "";

  if (typeof userOrHandle === "string") {
    uId = userOrHandle;
  } else if (userOrHandle && typeof userOrHandle === "object") {
    uId = userOrHandle.userId || "";
    uName = userOrHandle.name || "";
    uEmail = userOrHandle.email ? userOrHandle.email.split("@")[0] : "";
  }

  const rawId = uId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const rawName = uName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const rawEmail = uEmail.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  // 1. If username is between 5 and 12 chars, use direct clean username (e.g. "TRILLIONARE")
  if (rawId.length >= 5 && rawId.length <= 12) {
    return rawId;
  }
  // 2. If name is between 5 and 10 chars, use direct name
  if (rawName.length >= 5 && rawName.length <= 10) {
    return rawName;
  }
  // 3. If email handle is between 5 and 12 chars, use email handle
  if (rawEmail.length >= 5 && rawEmail.length <= 12) {
    return rawEmail;
  }

  // 4. Fallback with suffix
  const base = rawName || rawId || "READ";
  let randomPart = "";
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * ALPHANUMERIC_SAFE.length);
    randomPart += ALPHANUMERIC_SAFE[idx];
  }
  return `${base.slice(0, 7)}${randomPart}`.slice(0, 10);
}

/**
 * Ensures user has a permanent unique referral code.
 * If user does not have one, generates one, checks uniqueness, and saves it.
 */
export async function ensureUserReferralCode(userDoc: any): Promise<string> {
  if (userDoc.referralCode && typeof userDoc.referralCode === "string" && userDoc.referralCode.trim().length >= 4) {
    return userDoc.referralCode.toUpperCase().trim();
  }

  let code = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    code = generateCandidateReferralCode(userDoc);
    if (attempts > 1) {
      code = `${code.slice(0, 8)}${attempts}`;
    }
    const existing = await User.findOne({ referralCode: code }).select("_id").lean();
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    code = `RD${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  userDoc.referralCode = code;
  await User.updateOne({ _id: userDoc._id }, { $set: { referralCode: code } });
  return code;
}
