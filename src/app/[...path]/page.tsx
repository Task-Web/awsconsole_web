"use client";

import dynamic from "next/dynamic";

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

export default function CatchAllPage() {
  return <AwsApp />;
}
