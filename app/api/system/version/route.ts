import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const minVersion = process.env.MIN_SUPPORTED_VERSION || "1.0.0";
    const latestVersion = process.env.LATEST_VERSION || "1.0.0";
    const forceUpdateEnabled = process.env.FORCE_UPDATE_ENABLED === "true";
    const storeUrl =
      process.env.PLAY_STORE_URL ||
      "https://play.google.com/store/apps/details?id=com.readapt.app";

    return NextResponse.json(
      {
        success: true,
        minVersion,
        latestVersion,
        forceUpdate: forceUpdateEnabled,
        storeUrl,
        title: process.env.UPDATE_TITLE || "Update Required",
        message:
          process.env.UPDATE_MESSAGE ||
          "A brand new version of READAPT is available with new modules, features, and performance improvements. Please update to continue reading.",
        releaseNotes: [
          "New exclusive book series and daily reading tracks",
          "Enhanced audio playback and smoother chapter reading",
          "Performance optimizations and security improvements",
        ],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("Version check error:", error);
    return NextResponse.json(
      {
        success: false,
        minVersion: "1.0.0",
        latestVersion: "1.0.0",
        forceUpdate: false,
      },
      { status: 500 }
    );
  }
}
