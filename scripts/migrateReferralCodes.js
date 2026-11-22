const mongoose = require("mongoose");
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/staging";

function generateUserReferralCode(user, existingCodes) {
  // Use clean userId or name or email prefix
  const rawId = (user.userId || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const rawName = (user.name || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const emailPrefix = (user.email ? user.email.split("@")[0] : "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  let candidate = "";

  // 1. If userId is between 5 and 12 chars, use it! (e.g. "TRILLIONARE")
  if (rawId.length >= 5 && rawId.length <= 12) {
    candidate = rawId;
  } else if (rawName.length >= 5 && rawName.length <= 10) {
    candidate = rawName;
  } else if (emailPrefix.length >= 5 && emailPrefix.length <= 12) {
    candidate = emailPrefix;
  } else {
    const base = rawName || rawId || "READ";
    const num = (user.email || "").match(/\d+/);
    candidate = (base + (num ? num[0] : "99")).padEnd(6, "X").slice(0, 10);
  }

  // Ensure 6-12 chars
  if (candidate.length < 6) {
    candidate = candidate.padEnd(6, "7");
  } else if (candidate.length > 12) {
    candidate = candidate.slice(0, 10);
  }

  // Ensure uniqueness
  let finalCode = candidate;
  let counter = 1;
  while (existingCodes.has(finalCode)) {
    finalCode = (candidate.slice(0, 8) + counter).slice(0, 12);
    counter++;
  }
  existingCodes.add(finalCode);
  return finalCode;
}

async function run() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  const existingCodes = new Set();

  for (const u of users) {
    if (u.referralCode && typeof u.referralCode === "string" && u.referralCode.length >= 5) {
      existingCodes.add(u.referralCode.toUpperCase());
    }
  }

  for (const u of users) {
    let code = u.referralCode;
    if (!code || typeof code !== "string" || code.length < 5) {
      code = generateUserReferralCode(u, existingCodes);
    } else {
      code = code.toUpperCase().trim();
    }

    await mongoose.connection.db.collection("users").updateOne(
      { _id: u._id },
      {
        $set: {
          referralCode: code,
          totalReferralsCount: typeof u.totalReferralsCount === "number" ? u.totalReferralsCount : 0,
          hasRedeemedReferral: typeof u.hasRedeemedReferral === "boolean" ? u.hasRedeemedReferral : false,
          referredBy: u.referredBy || null,
        },
      }
    );
    console.log(`Updated [${u.email || u.name} (${u.userId})] -> referralCode: ${code}`);
  }

  console.log("All users successfully migrated with permanent referral codes in MongoDB!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
