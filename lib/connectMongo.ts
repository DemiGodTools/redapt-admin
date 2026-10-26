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

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://manof2028_db_user:IZWbG0pie9HAEm8Y@navigate.k1qjbde.mongodb.net/staging?appName=navigate";

// Direct replica-set URI fallback in case DNS SRV is blocked by local firewall/ISP
const DIRECT_MONGODB_URI =
  "mongodb://manof2028_db_user:IZWbG0pie9HAEm8Y@ac-vbe84nj-shard-00-00.k1qjbde.mongodb.net:27017,ac-vbe84nj-shard-00-01.k1qjbde.mongodb.net:27017,ac-vbe84nj-shard-00-02.k1qjbde.mongodb.net:27017/staging?ssl=true&replicaSet=atlas-wmub0u-shard-0&authSource=admin&appName=navigate";

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
      try {
        return await mongoose.connect(MONGODB_URI, {
          dbName: "staging",
          bufferCommands: false,
          serverSelectionTimeoutMS: 6000,
        });
      } catch (err: any) {
        if (
          err?.message?.includes("querySrv") ||
          err?.message?.includes("ETIMEOUT") ||
          err?.message?.includes("ENOTFOUND")
        ) {
          console.warn("⚠️ SRV resolution failed, falling back to direct replica-set URI...");
          return await mongoose.connect(DIRECT_MONGODB_URI, {
            dbName: "staging",
            bufferCommands: false,
            serverSelectionTimeoutMS: 6000,
          });
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
