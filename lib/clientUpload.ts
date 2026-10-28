/**
 * Smart Client Uploader for Backblaze B2
 * Uploads directly to B2 via Presigned URLs with live progress tracking,
 * and automatically falls back to /api/upload if needed.
 */
export async function uploadFileSmart(
  file: File,
  folder: string = "media",
  onProgress?: (percent: number) => void
): Promise<string> {
  try {
    // 1. Try to get Presigned URL for high-speed direct upload
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder,
      }),
    });

    if (presignRes.ok) {
      const presignData = await presignRes.json();
      if (presignData?.uploadUrl) {
        return await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignData.uploadUrl, true);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

          if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
              }
            };
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(presignData.publicUrl);
            } else {
              // Direct upload failed (e.g. CORS not configured yet), fallback to server
              console.warn("Direct B2 PUT returned status", xhr.status, "- falling back to server uploader");
              fallbackServerUpload(file, folder).then(resolve).catch(reject);
            }
          };

          xhr.onerror = () => {
            console.warn("Direct B2 PUT network/cors error - falling back to server uploader");
            fallbackServerUpload(file, folder).then(resolve).catch(reject);
          };

          xhr.send(file);
        });
      }
    }
  } catch (err) {
    console.warn("Presigned uploader check failed, using server fallback:", err);
  }

  // 2. Server-side fallback upload
  return fallbackServerUpload(file, folder);
}

async function fallbackServerUpload(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json().catch(() => null);

  if (res.ok && data?.success && data?.url) {
    return data.url;
  }
  throw new Error(data?.message || "Upload failed");
}

