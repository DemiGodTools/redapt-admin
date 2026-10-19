import { createUploadthing, type FileRouter } from "uploadthing/next";
import { User } from "@/models/User.model";
import connectMongo from "@/lib/connectMongo";
import { UploadThingError } from "uploadthing/server";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

// ⚡ UTApi server instance direct file handling ke liye
export const utapi = new UTApi();

export const ourFileRouter = {
  // User Profile Avatar
  profileImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const userEmail = req.headers.get("x-user-email");
      if (!userEmail) {
        throw new UploadThingError("Unauthorized (no user email)");
      }
      return { userEmail };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await connectMongo();
      const user = await User.findOneAndUpdate(
        { email: metadata.userEmail },
        { $set: { image: file.ufsUrl || file.url } },
        { new: true }
      );
      return { avatarUrl: file.ufsUrl || file.url };
    }),

  // ⚡ Chapter PDFs, Audios, and Covers
  chapterMedia: f({
    pdf: { maxFileSize: "64MB", maxFileCount: 1 },
    audio: { maxFileSize: "64MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;