import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const rawEndpoint = process.env.B2_ENDPOINT || "s3.eu-central-003.backblazeb2.com";
const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, "").trim();

const defaultRegion = cleanEndpoint.split(".")[1] || "eu-central-003";
const region = process.env.B2_REGION || defaultRegion;

export const B2_BUCKET = process.env.B2_BUCKET_NAME || "readapt-media";

export const b2Client = new S3Client({
  endpoint: `https://${cleanEndpoint}`,
  region: region,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID || "003db1d5046e5660000000002",
    secretAccessKey: process.env.B2_APPLICATION_KEY || "K0037vNP5RopCBmn73pjNtu9YzzO14Q",
  },
});

/**
 * Returns a clean stream URL for our Private Backblaze B2 bucket
 */
export function getB2MediaUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  const baseUrl = process.env.NEXTAUTH_URL 
    ? process.env.NEXTAUTH_URL.replace(/\/+$/, "")
    : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://redapt-admin.vercel.app");

  return `${baseUrl}/api/media/${cleanKey}`;
}

export const getB2PublicUrl = getB2MediaUrl;

/**
 * Generates an on-the-fly secure presigned download/stream URL for a key
 */
export async function getB2SignedDownloadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  const cleanKey = key.replace(/^\/+/, "");
  const cmd = new GetObjectCommand({
    Bucket: B2_BUCKET,
    Key: cleanKey,
  });
  return await getSignedUrl(b2Client, cmd, { expiresIn: expiresInSeconds });
}

/**
 * Format bytes to readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0 || !Number.isFinite(bytes)) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

let cachedB2SizeMap: { map: Map<string, number>; rawContents: any[]; expiresAt: number } | null = null;

/**
 * Lists B2 objects with short in-memory cache to quickly look up file sizes
 */
export async function getB2ObjectSizeMap(): Promise<{ map: Map<string, number>; rawContents: any[] }> {
  const now = Date.now();
  if (cachedB2SizeMap && cachedB2SizeMap.expiresAt > now) {
    return cachedB2SizeMap;
  }

  try {
    const cmd = new ListObjectsV2Command({
      Bucket: B2_BUCKET,
      MaxKeys: 1000,
    });
    const res = await b2Client.send(cmd);
    const contents = res.Contents || [];
    const map = new Map<string, number>();

    contents.forEach((item) => {
      if (item.Key && item.Size !== undefined) {
        const fullKey = item.Key.toLowerCase().trim();
        map.set(fullKey, item.Size);

        const filename = fullKey.split("/").pop();
        if (filename && !map.has(filename)) {
          map.set(filename, item.Size);
        }
      }
    });

    cachedB2SizeMap = { map, rawContents: contents, expiresAt: now + 30000 };
    return cachedB2SizeMap;
  } catch (err) {
    console.warn("Failed to query B2 object map:", err);
    return cachedB2SizeMap || { map: new Map(), rawContents: [] };
  }
}

/**
 * Extract size in bytes from URL or storage key
 */
export function getFileSizeFromUrlOrKey(urlOrKey?: string | null, sizeMap?: Map<string, number>): number {
  if (!urlOrKey || !sizeMap) return 0;
  const raw = String(urlOrKey).trim().toLowerCase();
  if (sizeMap.has(raw)) return sizeMap.get(raw)!;

  // Check without query string
  const cleanUrl = raw.split("?")[0];
  if (sizeMap.has(cleanUrl)) return sizeMap.get(cleanUrl)!;

  // Check key after /api/media/
  if (cleanUrl.includes("/api/media/")) {
    const mediaKey = cleanUrl.split("/api/media/")[1];
    if (mediaKey && sizeMap.has(mediaKey)) return sizeMap.get(mediaKey)!;
  }

  // Check raw filename
  const filename = cleanUrl.split("/").pop();
  if (filename && sizeMap.has(filename)) return sizeMap.get(filename)!;

  return 0;
}

/**
 * Upload Buffer directly to Backblaze B2 private bucket
 */
export async function uploadBufferToB2(
  buffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  folder: string = "media"
): Promise<{ url: string; key: string }> {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${Date.now()}-${sanitizedName}`;

  await b2Client.send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return {
    url: getB2MediaUrl(key),
    key,
  };
}
