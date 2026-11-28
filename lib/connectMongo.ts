import mongoose from "mongoose";
import dns from "dns";

// Register all models to prevent MissingSchemaError on population
import "@/models/Admin.model";
import "@/models/Category.model";
import "@/models/Chapter.model";
import "@/models/Comment.model";
import "@/models/Payment.model";
import "@/models/Question.model";
import "@/models/Series.model";
import "@/models/Thought.model";
import "@/models/User.model";

// Fix Node.js DNS SRV timeout on Windows / ISP networks (e.g. Jio / Airtel)
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {}

const MONGODB_URI = process.env.MONGODB_URI || "";
const DIRECT_MONGODB_URI = process.env.DIRECT_MONGODB_URI || MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "staging";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectMongo(): Promise<typeof mongoose> {
  if (cached?.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached?.promise) {
    const connectWithOptions = async () => {
      if (!MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is missing!");
      }
      const poolOptions = {
        dbName: DB_NAME,
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 20000,
        maxPoolSize: 5,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
      };
      // Prefer direct replica-set URI when configured to avoid 5s SRV DNS timeouts on serverless/ISP networks
      const primaryUri =
        DIRECT_MONGODB_URI && DIRECT_MONGODB_URI !== MONGODB_URI
          ? DIRECT_MONGODB_URI
          : MONGODB_URI;
      const fallbackUri = primaryUri !== MONGODB_URI ? MONGODB_URI : "";
      try {
        return await mongoose.connect(primaryUri, poolOptions);
      } catch (err: any) {
        if (
          fallbackUri &&
          (err?.message?.includes("querySrv") ||
            err?.message?.includes("ETIMEOUT") ||
            err?.message?.includes("ENOTFOUND"))
        ) {
          console.warn("⚠️ Primary Mongo URI failed, falling back to secondary URI...");
          return await mongoose.connect(fallbackUri, poolOptions);
        }
        throw err;
      }
    };

    cached!.promise = connectWithOptions().catch((err) => {
      cached!.promise = null;
      throw err;
    });
  }

  try {
    cached!.conn = await cached!.promise;
    console.log(`✅ MongoDB connected to staging`);
    return cached!.conn;
  } catch (err) {
    cached!.promise = null;
    throw err;
  }
}

export default connectMongo;
