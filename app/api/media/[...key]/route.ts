import { NextRequest, NextResponse } from "next/server";
import { getB2SignedDownloadUrl } from "@/lib/b2";
import { recordBandwidthEgress } from "@/lib/bandwidthTracker";

export const dynamic = "force-dynamic";

function guessMimeType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
    case "jfif":
      return "image/jpeg";
    case "avif":
      return "image/avif";
    case "heic":
      return "image/heic";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "pdf":
      return "application/pdf";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keySegments } = await params;
    if (!keySegments || keySegments.length === 0) {
      return NextResponse.json({ error: "Missing media key" }, { status: 400 });
    }

    const key = keySegments.join("/");

    // Every image namespace and every image extension must take the CDN
    // proxy path below. `categories/` and `avatars/` used to fall through to
    // the uncached 307 branch, which meant a fresh serverless invocation plus
    // a full B2 round trip for every category cover on every cold load.
    const IMAGE_KEY_PREFIXES = [
      "banners/",
      "covers/",
      "categories/",
      "avatars/",
      "profiles/",
      "series/",
      "chapters/",
      "books/",
    ];
    const isImage =
      /\.(jpe?g|jfif|png|webp|avif|heic|gif|svg|bmp)$/i.test(key) ||
      IMAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

    // Vercel Functions cap a response body at ~4.5 MB; anything bigger must
    // keep using the 307 redirect so it streams straight from B2.
    const MAX_PROXY_BYTES = 4 * 1024 * 1024;

    // Generate secure signed URL valid for 2 hours
    const signedUrl = await getB2SignedDownloadUrl(key, 7200);

    // ⚡ 1. Images & Covers: Direct Edge Stream & Global CDN Cache
    // Proxies from B2 and caches on Vercel's Edge Network (Mumbai, Delhi, etc.)
    // Transforms 2-3 second latency into 15ms-40ms instant loads!
    if (isImage) {
      try {
        const b2Res = await fetch(signedUrl);
        const upstreamLength = Number(b2Res.headers.get("content-length") || 0);

        if (b2Res.ok && b2Res.body && upstreamLength <= MAX_PROXY_BYTES) {
          const contentType =
            b2Res.headers.get("content-type") || guessMimeType(key);
          const contentLength = upstreamLength || 180000;
          recordBandwidthEgress(key, contentLength).catch(() => {});

          return new Response(b2Res.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(contentLength),
              // Immutable: a media key never changes content, so the edge and
              // the device can keep it for a month and a week respectively.
              "Cache-Control":
                "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
              "CDN-Cache-Control": "public, s-maxage=2592000",
              "Vercel-CDN-Cache-Control": "public, s-maxage=2592000",
            },
          });
        }

        if (b2Res.ok && upstreamLength > MAX_PROXY_BYTES) {
          console.warn(
            `Media ${key} is ${upstreamLength} bytes; serving via 307 redirect instead of proxy.`
          );
        }
      } catch (streamErr) {
        console.warn("Direct B2 proxy stream failed, falling back to 307 redirect:", streamErr);
      }
    }

    // ⚡ 2. Large Media (Audio / Heavy PDFs): Cached 307 Redirect
    // Allows range requests & lock-screen scrubbing without serverless limits,
    // with client-side & edge caching for 1-2 hours so it doesn't re-sign on every scrub.
    const estMediaBytes = key.endsWith(".mp3") || key.endsWith(".m4a") ? 3500000 : 1500000;
    recordBandwidthEgress(key, estMediaBytes).catch(() => {});

    const response = NextResponse.redirect(signedUrl, 307);
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400"
    );
    return response;
  } catch (error: any) {
    console.error("Media stream redirect error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to stream media" },
      { status: 500 }
    );
  }
}

