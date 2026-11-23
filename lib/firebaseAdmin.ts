import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import fs from "fs";
import path from "path";

/**
 * Singleton Firebase Admin SDK initialization.
 * Reads credentials from:
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY env variable (JSON string or base64 - ideal for Vercel/Production)
 * 2. Or local file 'firebase-service-account.json' in redapt-admin root
 */
function getFirebaseAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  let serviceAccount: any = null;

  // 1. Check environment variable first
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (envKey) {
    try {
      const decoded = envKey.startsWith("{")
        ? envKey
        : Buffer.from(envKey, "base64").toString("utf-8");
      serviceAccount = JSON.parse(decoded);
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var:", err);
    }
  }

  // 2. Check local file if env variable not present
  if (!serviceAccount) {
    const localFilePath = path.join(process.cwd(), "firebase-service-account.json");
    if (fs.existsSync(localFilePath)) {
      try {
        const fileContent = fs.readFileSync(localFilePath, "utf-8");
        serviceAccount = JSON.parse(fileContent);
      } catch (err) {
        console.error("Failed to read firebase-service-account.json:", err);
      }
    }
  }

  if (!serviceAccount) {
    throw new Error(
      "Firebase Admin credentials not found! Place 'firebase-service-account.json' in redapt-admin or set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local"
    );
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getFirebaseMessaging(): Messaging {
  const app = getFirebaseAdminApp();
  return getMessaging(app);
}
