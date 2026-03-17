import { NextRequest, NextResponse } from "next/server";
import { getUserId, setUserCookie, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/cookies";
import { fileStore } from "@/lib/file-store";
import fs from "fs/promises";
import mime from "mime-types";

// GET /api/files/[filename] - Fetch a stored file for the current user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const userId = await getUserId(request);
  const { filename } = await params;

  const targetPath = await fileStore.getFilePath(userId, filename);

  if (!targetPath) {
    const errorResponse = NextResponse.json(
      { detail: "File not found" },
      { status: 404 }
    );
    setUserCookie(errorResponse, userId);
    return errorResponse;
  }

  try {
    const fileBuffer = await fs.readFile(targetPath);
    const displayName = fileStore.getDisplayName(filename);
    const contentType = mime.lookup(displayName) || "application/octet-stream";

    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${displayName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

    // Set user cookie manually since we're using raw NextResponse
    response.cookies.set(COOKIE_NAME, userId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("File read error:", error);
    const errorResponse = NextResponse.json(
      { detail: "Failed to read file" },
      { status: 500 }
    );
    setUserCookie(errorResponse, userId);
    return errorResponse;
  }
}
