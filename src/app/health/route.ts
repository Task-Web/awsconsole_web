import { NextResponse } from "next/server";

// GET /health - Health check
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
