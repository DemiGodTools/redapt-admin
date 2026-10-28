import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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
