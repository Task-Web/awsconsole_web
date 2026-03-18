import { NextRequest } from "next/server";
import { getUserId, createResponseWithCookie } from "@/lib/cookies";
import { startInstance, isDockerAvailable } from "@/lib/docker-client";

// POST /api/ec2/instances/:id/start
export async function POST(
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
    await startInstance(userId, id);
    return createResponseWithCookie({ message: "Instance started" }, userId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to start";
    return createResponseWithCookie({ error: message }, userId, 500);
  }
}
