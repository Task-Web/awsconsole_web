"use client";

import { useEffect, useState } from "react";
import { COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/constants";

export function buildRedirectUrlWithoutCookie(url: URL): string {
  const redirectUrl = new URL(url.toString());
  redirectUrl.searchParams.delete("cookie");

  const query = redirectUrl.searchParams.toString();
  return `${redirectUrl.origin}${redirectUrl.pathname}${query ? `?${query}` : ""}${redirectUrl.hash}`;
}

/**
 * Applies cookie override from query parameter (constitutional requirement).
 * If ?cookie=<value> is present, sets the cookie and redirects to clean URL.
 * @returns true if a redirect occurred (component should not render)
 */
function applyCookieFromQuery(): boolean {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  const override = url.searchParams.get("cookie");
  if (!override) return false;

  let cookie = `${COOKIE_NAME}=${encodeURIComponent(override)}; Path=/; SameSite=Lax`;
  if (Number.isFinite(COOKIE_MAX_AGE) && COOKIE_MAX_AGE > 0) {
    cookie += `; Max-Age=${Math.floor(COOKIE_MAX_AGE)}`;
  }
  document.cookie = cookie;

  const redirectUrl = buildRedirectUrlWithoutCookie(url);
  if (window.location.href !== redirectUrl) {
    window.location.replace(redirectUrl);
    return true;
  }
  return false;
}

/**
 * Hook that handles cookie override from URL query parameter.
 * Returns { ready: boolean } - when ready is false, the component should not render
 * as a redirect is in progress.
 */
export function useCookieOverride(): { ready: boolean } {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const redirected = applyCookieFromQuery();
    if (!redirected) {
      setReady(true);
    }
  }, []);

  return { ready };
}
