import { NextRequest } from "next/server";
import { getUserId } from "@/lib/cookies";
import { createResponseWithCookie } from "@/lib/cookies";
import { listAmis, isDockerAvailable } from "@/lib/docker-client";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);

  if (!(await isDockerAvailable())) {
    return createResponseWithCookie(
      { error: "Docker is not available", amis: [] },
      userId,
      503
    );
  }

  const amis = await listAmis();
  return createResponseWithCookie({ amis }, userId);
}
