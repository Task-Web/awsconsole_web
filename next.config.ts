import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker builds
  output: "standalone",
  // Enable server actions for form handling
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Mark dockerode and its dependencies as server-only externals
  serverExternalPackages: ["dockerode", "docker-modem", "ssh2"],
};

export default nextConfig;
