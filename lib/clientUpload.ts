/**
 * High-Reliability Client Uploader with Real-Time Progress Tracking.
 * Uses direct S3 Presigned PUT to Backblaze B2 for files > 3.5 MB so large
 * audios and PDFs (50MB, 100MB, 500MB+) bypass Vercel's 4.5 MB body limit.
 */
export async function uploadFileSmart(
  file: File,
  folder: string = "media",
  onProgress?: (percent: number) => void
): Promise<string> {
  const DIRECT_UPLOAD_THRESHOLD = 3.5 * 1024 * 1024; // 3.5 MB

  if (file.size > DIRECT_UPLOAD_THRESHOLD) {
    const contentType = file.type || "application/octet-stream";

    // 1. Get presigned S3 PUT URL from backend
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType,
        folder,
      }),
    });

    const presignData = await presignRes.json();
    if (!presignRes.ok || !presignData?.success || !presignData?.uploadUrl || !presignData?.publicUrl) {
      throw new Error(presignData?.error || presignData?.message || "Failed to initialize direct upload");
    }

    // 2. Upload directly to Backblaze B2 via XHR PUT with live progress
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignData.uploadUrl, true);
      xhr.setRequestHeader("Content-Type", contentType);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(presignData.publicUrl);
        } else {
          reject(new Error(`Direct B2 upload failed (HTTP ${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during direct B2 file upload"));
      };

      xhr.send(file);
    });
  }

  // Standard small-file upload via /api/upload
  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data?.success && data?.url) {
          resolve(data.url);
        } else {
          reject(new Error(data?.message || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload response parsing error"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file upload"));
    };

    xhr.send(formData);
  });
}
