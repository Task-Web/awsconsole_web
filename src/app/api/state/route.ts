import { NextRequest } from "next/server";
import { getUserId, createResponseWithCookie } from "@/lib/cookies";
import { stateStore } from "@/lib/state-store";
import { fileStore } from "@/lib/file-store";
import { StateResponse, StateRequest, StatePatchRequest } from "@/lib/types";
import { reconcileEc2 } from "@/lib/ec2-reconciler";
import { terminateAllInstances, isDockerAvailable } from "@/lib/docker-client";

// Run EC2 reconciliation after state changes
async function runReconciliation(userId: string) {
  try {
    if (!(await isDockerAvailable())) return;
    const currentState = await stateStore.getState(userId);
    const ec2Array = (currentState.data as Record<string, unknown>)?.ec2;
    if (Array.isArray(ec2Array)) {
      const reconciled = await reconcileEc2(userId, ec2Array);
      // Write reconciled Docker state back into user state
      await stateStore.patchState(userId, { ec2: reconciled });
    }
  } catch (e) {
    console.error("EC2 reconciliation failed:", e);
  }
}

// GET /api/state - Retrieve current user state
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  const state = await stateStore.getState(userId);

  const response: StateResponse = {
    user_id: userId,
    state,
  };

  return createResponseWithCookie(response, userId);
}

// PUT /api/state - Replace entire state
export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);

  let payload: StateRequest;
  try {
    payload = await request.json();
  } catch {
    return createResponseWithCookie(
      { detail: "Invalid JSON body" },
      userId,
      400
    );
  }

  const nextState: {
    data: Record<string, unknown>;
    note: string | null;
    meta?: StateRequest["meta"];
  } = {
    data: payload.data || {},
    note: payload.note ?? null,
  };

  if (payload.meta) {
    nextState.meta = payload.meta;
  }

  const state = await stateStore.replaceState(userId, nextState);

  // Reconcile EC2 instances with Docker after state change
  // Skip if the request has the internal header (to prevent loops)
  const isInternal = request.headers.get("x-reconcile-skip") === "true";
  if (!isInternal) {
    await runReconciliation(userId);
  }

  // Re-read state after reconciliation
  const finalState = await stateStore.getState(userId);
  const response: StateResponse = {
    user_id: userId,
    state: finalState,
  };

  return createResponseWithCookie(response, userId);
}

// PATCH /api/state - Merge into existing state
export async function PATCH(request: NextRequest) {
  const userId = await getUserId(request);

  let payload: StatePatchRequest;
  try {
    payload = await request.json();
  } catch {
    return createResponseWithCookie(
      { detail: "Invalid JSON body" },
      userId,
      400
    );
  }

  const state = await stateStore.patchState(
    userId,
    payload.data || {},
    payload.note
  );

  // Reconcile EC2 instances with Docker after state change
  const patchedData = payload.data as Record<string, unknown> | undefined;
  if (patchedData && "ec2" in patchedData) {
    await runReconciliation(userId);
  }

  // Re-read state after reconciliation
  const finalState = await stateStore.getState(userId);
  const response: StateResponse = {
    user_id: userId,
    state: finalState,
  };

  return createResponseWithCookie(response, userId);
}

// DELETE /api/state - Reset and clear state
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);

  // Terminate all Docker containers for this user
  try {
    if (await isDockerAvailable()) {
      await terminateAllInstances(userId);
    }
  } catch (e) {
    console.error("Failed to cleanup Docker containers on state reset:", e);
  }

  // Delete user files
  await fileStore.deleteUserFiles(userId);

  // Reset state
  const state = await stateStore.resetState(userId);

  const response: StateResponse = {
    user_id: userId,
    state,
  };

  return createResponseWithCookie(response, userId);
}
