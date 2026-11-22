export const DAILY_TARGET_SECONDS = 240; // 4 minutes quality reading time

export function getLocalDateString(timeZone: string, date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/**
 * Calculates exact calendar day difference between today and a past YYYY-MM-DD date.
 * Returns:
 *  0: same day
 *  1: yesterday
 *  >1: missed 1 or more days (streak broken)
 *  Infinity: no past date or invalid
 */
export function getCalendarDayDifference(todayStr: string, pastDateStr?: string | null): number {
  if (!pastDateStr || typeof pastDateStr !== "string") return Infinity;
  const parts1 = todayStr.split("-").map(Number);
  const parts2 = pastDateStr.split("-").map(Number);
  if (parts1.length !== 3 || parts2.length !== 3) return Infinity;
  const [y1, m1, d1] = parts1;
  const [y2, m2, d2] = parts2;
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return Infinity;

  const utcToday = Date.UTC(y1, m1 - 1, d1);
  const utcPast = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((utcToday - utcPast) / msPerDay);
}

/**
 * Industry-level streak state validation and rollover.
 * Checks for missed days, rollover to a new day, bucket reset, and timezone alignment.
 * Returns boolean whether user document was modified.
 */
export function validateAndRollStreak(user: any, timezone: string = "Asia/Kolkata"): boolean {
  const tz = timezone || user.streakData?.timezone || "Asia/Kolkata";
  const today = getLocalDateString(tz);

  if (!user.streakData) {
    user.streakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
      todayReadingSeconds: 0,
      isCompletedToday: false,
      lastCompletedDate: "",
      timezone: tz,
      streak: 0,
      lastDate: today,
    };
    return true;
  }

  let modified = false;
  const data = user.streakData;

  // Normalize missing fields from legacy documents
  if (data.currentStreak === undefined) {
    data.currentStreak = Number(data.streak) || 0;
    modified = true;
  }
  if (data.longestStreak === undefined) {
    data.longestStreak = Number(data.currentStreak) || 0;
    modified = true;
  }
  if (data.todayReadingSeconds === undefined) {
    data.todayReadingSeconds = 0;
    modified = true;
  }
  if (data.isCompletedToday === undefined) {
    data.isCompletedToday = false;
    modified = true;
  }
  if (data.lastCompletedDate === undefined) {
    data.lastCompletedDate = data.lastDate || "";
    modified = true;
  }

  const diffDays = getCalendarDayDifference(today, data.lastCompletedDate);

  // Day changed since last active access
  if (data.lastActiveDate !== today) {
    data.todayReadingSeconds = 0;
    data.lastActiveDate = today;
    data.lastDate = today;
    modified = true;

    if (diffDays === 0) {
      // Completed earlier today
      data.isCompletedToday = true;
    } else if (diffDays === 1) {
      // Completed yesterday: streak intact! Ready for today's reading
      data.isCompletedToday = false;
    } else {
      // Missed 1 or more full days without achieving goal -> streak broken/decreased to 0
      data.currentStreak = 0;
      data.streak = 0;
      data.isCompletedToday = false;
    }
  } else {
    // Same day checks
    if (diffDays === 0) {
      if (!data.isCompletedToday) {
        data.isCompletedToday = true;
        modified = true;
      }
    } else if (diffDays === 1) {
      if (data.isCompletedToday) {
        data.isCompletedToday = false;
        modified = true;
      }
    } else if (diffDays > 1) {
      if (data.currentStreak > 0) {
        data.currentStreak = 0;
        data.streak = 0;
        modified = true;
      }
      if (data.isCompletedToday) {
        data.isCompletedToday = false;
        modified = true;
      }
    }
  }

  data.longestStreak = Math.max(data.longestStreak || 0, data.currentStreak || 0);

  if (data.timezone !== tz) {
    data.timezone = tz;
    modified = true;
  }

  return modified;
}
