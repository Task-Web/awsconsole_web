"use client";

import dynamic from "next/dynamic";
import { useCookieOverride } from "@/hooks/use-cookie-override";

const AwsApp = dynamic(() => import("@/components/aws/AwsApp"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily:
          '"Amazon Ember", "Helvetica Neue", -apple-system, sans-serif',
        color: "#545B64",
      }}
    >
      Loading AWS Console...
    </div>
  ),
});

export default function AwsConsoleClient() {
  const { ready } = useCookieOverride();

  if (!ready) {
    return null;
  }

  return <AwsApp />;
}
