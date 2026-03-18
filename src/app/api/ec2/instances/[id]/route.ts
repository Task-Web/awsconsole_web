import { NextRequest } from "next/server";
import { getUserId, createResponseWithCookie } from "@/lib/cookies";
import {
  getInstance,
  terminateInstance,
  isDockerAvailable,
} from "@/lib/docker-client";

// GET /api/ec2/instances/:id - Get instance details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  const { id } = await params;

  if (!(await isDockerAvailable())) {
    return createResponseWithCookie(
      { error: "Docker is not available" },
      userId,
      503
    );
  }

  const instance = await getInstance(userId, id);
  if (!instance) {
    return createResponseWithCookie(
      { error: "Instance not found" },
      userId,
      404
    );
  }

  return createResponseWithCookie({ instance }, userId);
}

// DELETE /api/ec2/instances/:id - Terminate instance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(request);
  const { id } = await params;

  if (!(await isDockerAvailable())) {
    return createResponseWithCookie(
      { error: "Docker is not available" },
      userId,
      503
    );
  }

  try {
    await terminateInstance(userId, id);
    return createResponseWithCookie(
      { message: "Instance terminated" },
      userId
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to terminate";
    return createResponseWithCookie({ error: message }, userId, 500);
  }
}
