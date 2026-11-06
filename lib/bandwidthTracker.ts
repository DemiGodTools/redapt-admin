import connectMongo from "@/lib/connectMongo";
import { DailyBandwidth } from "@/models/DailyBandwidth.model";

export function categorizeKey(key: string): "audio" | "pdf" | "image" | "other" {
  const lower = (key || "").toLowerCase();
  if (lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".wav") || lower.includes("audio")) {
    return "audio";
  }
  if (lower.endsWith(".pdf") || lower.includes("chapter_pdf") || lower.includes("doc")) {
    return "pdf";
  }
  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".svg") ||
    lower.includes("cover") ||
    lower.includes("banner") ||
    lower.includes("profile")
  ) {
    return "image";
  }
  return "other";
}

/**
 * Asynchronously record bandwidth consumed by media requests.
 * Runs non-blocking to keep media streaming snappy.
 */
export async function recordBandwidthEgress(key: string, bytes: number) {
  if (!bytes || bytes <= 0) return;

  try {
    await connectMongo();
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD" UTC
    const category = categorizeKey(key);

    const incQuery: any = {
      totalBytes: bytes,
      totalRequests: 1,
      [`breakdown.${category}.bytes`]: bytes,
      [`breakdown.${category}.hits`]: 1,
    };

    // Upsert today's document
    await DailyBandwidth.findOneAndUpdate(
      { date: today },
      {
        $inc: incQuery,
        $setOnInsert: { date: today },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Non-fatal, do not break client streaming
    console.warn("Bandwidth tracking warning:", err);
  }
}

