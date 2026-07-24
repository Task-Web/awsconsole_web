import { describe, expect, it } from "vitest";
import CatchAllPage from "./page";

describe("AWS catch-all", () => {
  it.each(["state-manage", "state-doc"])("returns 404 for retired %s pages", async (path) => {
    await expect(CatchAllPage({ params: Promise.resolve({ path: [path] }) })).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });
});
