import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// next dev が表示する LAN URL からの開発用 JS / HMR リクエストを許可する。
// DHCP でアドレスが変わっても、起動時のネットワーク設定に追従する。
const localNetworkAddresses = Object.values(networkInterfaces())
  .flatMap((entries) => entries ?? [])
  .filter((entry) => entry.family === "IPv4" && !entry.internal)
  .map((entry) => entry.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkAddresses,
  experimental: {
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
