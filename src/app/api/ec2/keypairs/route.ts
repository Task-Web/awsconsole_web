import { NextRequest } from "next/server";
import { getUserId, createResponseWithCookie } from "@/lib/cookies";
import {
  generateKeyPair,
  saveKeyPair,
  listKeyPairs,
} from "@/lib/keypair-manager";

// GET /api/ec2/keypairs - List all key pairs for current user
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const keyPairs = listKeyPairs(userId);
  return createResponseWithCookie({ keyPairs }, userId);
}

// POST /api/ec2/keypairs - Create a new key pair
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);

  try {
    const body = await request.json();
    const { name, type } = body;

    if (!name) {
      return createResponseWithCookie(
        { error: "name is required" },
        userId,
        400
      );
    }

    // Check for duplicate name
    const existing = listKeyPairs(userId);
    if (existing.some((kp) => kp.name === name)) {
      return createResponseWithCookie(
        { error: `Key pair "${name}" already exists` },
        userId,
        409
      );
    }

    // Generate real key pair
    const keyPair = generateKeyPair(name, type || "RSA");

    // Save public key (server-side)
    const { privateKey, ...publicData } = keyPair;
    saveKeyPair(userId, publicData);

    // Return full key pair including private key (one-time download)
    return createResponseWithCookie(
      {
        keyPair: publicData,
        privateKey: privateKey,
      },
      userId,
      201
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to create key pair";
    return createResponseWithCookie({ error: message }, userId, 500);
  }
}
