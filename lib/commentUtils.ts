export const MAX_COMMENT_LENGTH = 500;

export const COMMENT_USER_PROJECTION =
  "name userId image imageMd imageSm profileLevel bio profession visibility streakData";

export type SanitizeCommentResult =
  | { ok: true; text: string }
  | { ok: false; message: string };

/**
 * Normalizes and validates user-submitted comment text.
 * Strips unsafe control characters, collapses excessive blank lines, and enforces length limits.
 */
export function sanitizeCommentText(raw: unknown): SanitizeCommentResult {
  if (typeof raw !== "string") {
    return { ok: false, message: "Comment text is required" };
  }

  const normalized = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    return { ok: false, message: "Comment cannot be empty" };
  }

  if (normalized.length > MAX_COMMENT_LENGTH) {
    return {
      ok: false,
      message: `Comment exceeds maximum limit of ${MAX_COMMENT_LENGTH} characters`,
    };
  }

  return { ok: true, text: normalized };
}

/**
 * Normalizes comment documents so deleted/unpopulated authors still render gracefully
 * and strips invalid/corrupt records.
 */
export function normalizeCommentsList(
  comments: any[],
  currentUserEmail?: string | null,
  currentUserId?: string | null
): any[] {
  if (!Array.isArray(comments)) return [];

  return comments
    .filter((c) => c && typeof c === "object" && c._id)
    .map((c) => {
      if (typeof c.text !== "string") return null;

      const author = typeof c.by === "object" && c.by !== null ? c.by : null;
      const authorEmail = c.userEmail;
      const isOwner =
        (currentUserEmail &&
          authorEmail &&
          authorEmail.toLowerCase() === currentUserEmail.toLowerCase()) ||
        (currentUserId && author?._id && author._id.toString() === currentUserId.toString()) ||
        (currentUserId && c.by && c.by.toString() === currentUserId.toString());

      const name = author?.name || c.userName || (isOwner ? "You" : "Anonymous");
      const userId = author?.userId || c.userHandle || (isOwner ? "you" : "user");
      const image = author?.image || c.userImage || "";
      const profileLevel = author?.profileLevel || 1;

      return {
        ...c,
        _id: c._id?.toString?.() || String(c._id),
        text: String(c.text),
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        by: {
          _id: author?._id
            ? author._id.toString()
            : isOwner && currentUserId
              ? currentUserId
              : undefined,
          name,
          userId,
          image,
          imageMd: author?.imageMd,
          imageSm: author?.imageSm,
          profileLevel,
          bio: author?.bio,
          profession: author?.profession,
          visibility: author?.visibility,
          streakData: author?.streakData,
        },
      };
    })
    .filter(Boolean);
}

/**
 * Sorts normalized comment lists newest-first by createdAt (falling back to ObjectId timestamp).
 */
export function sortCommentsNewestFirst(comments: any[]): any[] {
  return [...comments].sort((a, b) => {
    const tA = a?.createdAt ? Date.parse(String(a.createdAt)) : 0;
    const tB = b?.createdAt ? Date.parse(String(b.createdAt)) : 0;
    if (Number.isFinite(tB) && Number.isFinite(tA) && tB !== tA) {
      return tB - tA;
    }
    return String(b?._id || "").localeCompare(String(a?._id || ""));
  });
}
