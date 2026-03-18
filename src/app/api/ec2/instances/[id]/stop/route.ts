import { NextRequest } from "next/server";
import { getUserId, createResponseWithCookie } from "@/lib/cookies";
import { stopInstance, isDockerAvailable } from "@/lib/docker-client";

// POST /api/ec2/instances/:id/stop
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
    await stopInstance(userId, id);
    return createResponseWithCookie({ message: "Instance stopped" }, userId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to stop";
    return createResponseWithCookie({ error: message }, userId, 500);
  }
}
