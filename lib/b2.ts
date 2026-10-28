import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const rawEndpoint = process.env.B2_ENDPOINT || "s3.us-east-005.backblazeb2.com";
const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, "").trim();

// Extract region from endpoint (e.g. "s3.us-east-005.backblazeb2.com" -> "us-east-005")
const defaultRegion = cleanEndpoint.split(".")[1] || "us-east-005";
const region = process.env.B2_REGION || defaultRegion;

export const B2_BUCKET = process.env.B2_BUCKET_NAME || "readapt-media";

export const b2Client = new S3Client({
  endpoint: `https://${cleanEndpoint}`,
  region: region,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID || "",
    secretAccessKey: process.env.B2_APPLICATION_KEY || "",
  },
});

/**
 * Returns the public direct HTTPS URL for a file stored in Backblaze B2
 */
export function getB2PublicUrl(key: string): string {
  if (process.env.B2_DOWNLOAD_URL) {
    const base = process.env.B2_DOWNLOAD_URL.replace(/\/+$/, "");
    return `${base}/file/${B2_BUCKET}/${key}`;
  }
  // S3-compatible virtual-host or standard path URL
  return `https://${B2_BUCKET}.${cleanEndpoint}/${key}`;
}

/**
 * Upload Buffer directly to Backblaze B2 bucket
 */
export async function uploadBufferToB2(
  buffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  folder: string = "media"
): Promise<string> {
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

  return getB2PublicUrl(key);
}

