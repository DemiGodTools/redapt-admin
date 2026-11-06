import crypto from "crypto";
import { User } from "@/models/User.model";
import { Series } from "@/models/Series.model";

/**
 * Masks an email for privacy, e.g. "rohit.sharma@example.com" -> "ro***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "u***@domain.com";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}

/**
 * Generates a cryptographically secure random token for account deletion verification.
 */
export function generateDeletionToken(): string {
  return "del_" + crypto.randomBytes(20).toString("hex");
}

/**
 * Purges accounts whose 48-hour deletion grace period has expired.
 * Preserves comments so discussion flow remains intact, but deletes
 * the personal User record and references.
 */
export async function purgeExpiredDeletions(): Promise<number> {
  try {
    const now = new Date();
    const expiredUsers = await User.find({
      deletionStatus: "PENDING_DELETION",
      deletionScheduledAt: { $lte: now },
    }).select("_id email");

    if (!expiredUsers || expiredUsers.length === 0) {
      return 0;
    }

    const expiredIds = expiredUsers.map((u) => u._id);

    // 1. Remove references in Series if present
    try {
      await Series.updateMany(
        { participants: { $in: expiredIds } },
        { $pull: { participants: { $in: expiredIds } } }
      ).catch(() => {});
    } catch {}

    // 2. Permanently delete User documents (comments remain intact)
    const result = await User.deleteMany({
      _id: { $in: expiredIds },
    });

    console.log(`[Account Deletion] Purged ${result.deletedCount} expired user accounts.`);
    return result.deletedCount || 0;
  } catch (error) {
    console.error("[Account Deletion] Error purging expired deletions:", error);
    return 0;
  }
}

