import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildRedirectUrlWithoutCookie,
  useCookieOverride,
} from "./use-cookie-override";

function Harness() {
  const { ready } = useCookieOverride();
  return <div>{ready ? "ready" : "redirecting"}</div>;
}

describe("useCookieOverride", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    document.cookie = "user_id=; Max-Age=0; Path=/";
  });

  it("removes only the cookie query parameter from the redirect url", () => {
    const url = new URL(
      "http://localhost/ec2?region=us-east-1&cookie=aws-user-7#instances"
    );

    expect(buildRedirectUrlWithoutCookie(url)).toBe(
      "http://localhost/ec2?region=us-east-1#instances"
    );
  });

  it("marks the hook as ready when no override is present", async () => {
    render(<Harness />);

    await screen.findByText("ready");
  });
});
