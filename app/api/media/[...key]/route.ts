import { NextRequest, NextResponse } from "next/server";
import { getCdnSignedUrl } from "@/lib/b2";
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
    case "opus":
    case "ogg":
      return "audio/ogg";
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

    // Only treat actual image extensions or pure image folders as images.
    // Never classify `chapters/` or `books/` blindly as images since PDFs/audios can live there.
    const IMAGE_KEY_PREFIXES = [
      "banners/",
      "covers/",
      "categories/",
      "avatars/",
      "profiles/",
      "series/",
    ];
    const isImage =
      /\.(jpe?g|jfif|png|webp|avif|heic|gif|svg|bmp)$/i.test(key) ||
      IMAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

    // Block direct incognito / browser address-bar downloads of protected audio/PDF assets
    const secFetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
    const secFetchMode = (req.headers.get("sec-fetch-mode") || "").toLowerCase();
    const acceptHeader = (req.headers.get("accept") || "").toLowerCase();
    const hasAdminCookie = Boolean(req.cookies.get("adminToken")?.value);
    const hasBearerToken = Boolean(req.headers.get("authorization")?.startsWith("Bearer "));

    const isDirectBrowserNav =
      secFetchDest === "document" ||
      secFetchMode === "navigate" ||
      (!isImage && acceptHeader.includes("text/html"));

    if (!isImage && isDirectBrowserNav && !hasAdminCookie && !hasBearerToken) {
      return NextResponse.json(
        { error: "Forbidden: Direct browser access is disabled" },
        { status: 403 }
      );
    }

    // Vercel Functions cap a response body at ~4.5 MB; anything bigger must
    // use the 307 redirect so it streams directly via Cloudflare CDN Worker.
    const MAX_PROXY_BYTES = 4 * 1024 * 1024;

    // Generate expiring HMAC-signed Cloudflare CDN URL valid for 6 hours
    const cdnUrl = getCdnSignedUrl(key, 21600);

    // ⚡ 1. Images & Covers: Direct Edge Stream & Global CDN Cache
    if (isImage) {
      try {
        const b2Res = await fetch(cdnUrl);
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
        console.warn("Direct CDN image proxy failed, falling back to 307 redirect:", streamErr);
      }
    }

    // ⚡ 2. Large Media (Audio / Heavy PDFs): Uncached 307 Redirect to fresh 6h CDN URL
    // Never cache the 307 itself at the edge so every redirect carries a fresh 6h expiration.
    const estMediaBytes =
      key.endsWith(".mp3") || key.endsWith(".m4a") || key.endsWith(".opus") ? 3500000 : 1500000;
    recordBandwidthEgress(key, estMediaBytes).catch(() => {});

    const response = NextResponse.redirect(cdnUrl, 307);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error: any) {
    console.error("Media stream redirect error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to stream media" },
      { status: 500 }
    );
  }
}
