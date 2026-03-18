import { NextRequest } from "next/server";
import { getUserId, createResponseWithCookie } from "@/lib/cookies";
import { getKeyPair, deleteKeyPair } from "@/lib/keypair-manager";

// GET /api/ec2/keypairs/:name - Get key pair details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const userId = await getUserId(request);
  const { name } = await params;

  const keyPair = getKeyPair(userId, name);
  if (!keyPair) {
    return createResponseWithCookie(
      { error: "Key pair not found" },
      userId,
      404
    );
  }

  return createResponseWithCookie({ keyPair }, userId);
}

// DELETE /api/ec2/keypairs/:name - Delete key pair
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const userId = await getUserId(request);
  const { name } = await params;

  const deleted = deleteKeyPair(userId, name);
  if (!deleted) {
    return createResponseWithCookie(
      { error: "Key pair not found" },
      userId,
      404
    );
  }

  return createResponseWithCookie({ message: "Key pair deleted" }, userId);
}
