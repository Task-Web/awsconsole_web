import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { stateStore } from "@/lib/state-store";
import { GET as getControlState } from "@/app/api/state/route";
import { GET } from "./route";
import { POST } from "./actions/route";

const request = (path: string, method = "GET", body?: unknown) => new NextRequest(`http://localhost${path}`, {
  method, headers: body === undefined ? undefined : { "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

describe("AWS feature API", () => {
  beforeEach(async () => stateStore.getStorage().clear());

  it("returns only the product projection and preserves control-plane fields", async () => {
    await stateStore.patchState("aws-a", { evaluator_marker: "keep" });
    const response = await GET(request("/api/aws-console?cookie=aws-a"));
    const body = await response.json();
    expect(body.console.user.region).toBe("us-east-1");
    expect(body.console.evaluator_marker).toBeUndefined();
    const control = await (await getControlState(request("/api/state?cookie=aws-a"))).json();
    expect(control.state.data.evaluator_marker).toBe("keep");
  });

  it("materializes the complete product projection on a successful action", async () => {
    await stateStore.patchState("aws-sparse", { evaluator_marker: "keep" });

    const response = await POST(request("/api/aws-console/actions?cookie=aws-sparse", "POST", {
      type: "SET_REGION",
      payload: "us-west-2",
    }));
    expect(response.status).toBe(200);

    const control = await (await getControlState(request("/api/state?cookie=aws-sparse"))).json();
    expect(control.state.data.user.region).toBe("us-west-2");
    expect(control.state.data.ec2).toEqual(expect.any(Array));
    expect(control.state.data.s3).toEqual(expect.any(Array));
    expect(control.state.data.billing).toEqual(expect.any(Object));
    expect(control.state.data.evaluator_marker).toBe("keep");
  });

  it("accepts a domain action and rejects cross-resource, internal, and invalid target fields", async () => {
    const success = await POST(request("/api/aws-console/actions?cookie=aws-a", "POST", { type: "SET_REGION", payload: "us-west-2" }));
    expect(success.status).toBe(200);
    const create = await POST(request("/api/aws-console/actions?cookie=aws-a", "POST", {
      type: "LAUNCH_INSTANCE", payload: { id: "i-new", name: "test", type: "t3.micro", state: "pending", ami: "ami-test" },
    }));
    expect(create.status).toBe(200);
    const crossResource = await POST(request("/api/aws-console/actions?cookie=aws-a", "POST", {
      type: "LAUNCH_INSTANCE", payload: { id: "i-new", name: "test", bucketName: "not-an-instance" },
    }));
    expect(crossResource.status).toBe(400);
    const internal = await POST(request("/api/aws-console/actions?cookie=aws-a", "POST", {
      type: "UPDATE_INSTANCE_TAGS", payload: { id: "i-0a1b2c3d4e5f6g7h8", tags: [], evaluator_marker: true },
    }));
    expect(internal.status).toBe(400);
    const missing = await POST(request("/api/aws-console/actions?cookie=aws-a", "POST", {
      type: "UPDATE_INSTANCE_STATE", payload: { id: "missing", state: "running" },
    }));
    expect(missing.status).toBe(404);
    const illegal = await POST(request("/api/aws-console/actions?cookie=aws-a", "POST", {
      type: "UPDATE_INSTANCE_STATE", payload: { id: "i-0a1b2c3d4e5f6g7h8", state: "terminated" },
    }));
    expect(illegal.status).toBe(409);
    const control = await (await getControlState(request("/api/state?cookie=aws-a"))).json();
    expect(control.state.data.user.region).toBe("us-west-2");
    expect(control.state.data.ec2.some((item: { id: string }) => item.id === "i-new")).toBe(true);
    const other = await (await getControlState(request("/api/state?cookie=aws-b"))).json();
    expect(other.state.data.user.region).toBe("us-east-1");
  });
});
