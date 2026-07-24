import { NextRequest } from "next/server";
import { createResponseWithCookie, getUserId } from "@/lib/cookies";
import { stateStore } from "@/lib/state-store";
import { projectAwsState } from "@/lib/aws-projection";

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const current = await stateStore.getState(userId);
  const consoleState = projectAwsState(current.data);
  return createResponseWithCookie({ user_id: userId, console: consoleState }, userId);
}
