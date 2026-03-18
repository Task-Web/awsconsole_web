import { NextRequest } from "next/server";
import { getUserId, createResponseWithCookie } from "@/lib/cookies";
import {
  listInstances,
  launchInstance,
  isDockerAvailable,
} from "@/lib/docker-client";

// GET /api/ec2/instances - List all instances for current user
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);

  if (!(await isDockerAvailable())) {
    return createResponseWithCookie(
      { error: "Docker is not available", instances: [] },
      userId,
      503
    );
  }

  const instances = await listInstances(userId);
  return createResponseWithCookie({ instances }, userId);
}

// POST /api/ec2/instances - Launch a new instance
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);

  if (!(await isDockerAvailable())) {
    return createResponseWithCookie(
      { error: "Docker is not available" },
      userId,
      503
    );
  }

  try {
    const body = await request.json();
    const { name, amiTag, amiId, amiName, instanceType, platform, tags } =
      body;

    if (!name || !amiTag) {
      return createResponseWithCookie(
        { error: "name and amiTag are required" },
        userId,
        400
      );
    }

    const instance = await launchInstance(userId, {
      name,
      amiTag,
      amiId: amiId || "",
      amiName: amiName || "",
      instanceType: instanceType || "t2.micro",
      platform,
      tags,
    });

    return createResponseWithCookie({ instance }, userId, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to launch instance";
    return createResponseWithCookie({ error: message }, userId, 500);
  }
}
