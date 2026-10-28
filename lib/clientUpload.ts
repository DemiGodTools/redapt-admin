/**
 * High-Reliability Client Uploader with Real-Time Progress Tracking
 */
export async function uploadFileSmart(
  file: File,
  folder: string = "media",
  onProgress?: (percent: number) => void
): Promise<string> {
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
      } catch (e: any) {
        reject(new Error("Upload response parsing error"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file upload"));
    };

    xhr.send(formData);
  });
}
