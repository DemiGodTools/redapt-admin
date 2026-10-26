import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  // Clear the adminToken cookie by setting expiration to past date
  response.cookies.set("adminToken", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}