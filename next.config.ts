import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.join(/*turbopackIgnore: true*/ __dirname);

function splitOrigins(value?: string) {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function detectedTailnetDevOrigins() {
  const origins = new Set<string>();

  try {
    const ips = execFileSync("tailscale", ["ip", "-4"], { encoding: "utf8", timeout: 1_000 });
    splitOrigins(ips.replace(/\n/g, ",")).forEach((ip) => origins.add(ip));
  } catch {
    // Tailscale is optional; clones without it can use NEXT_ALLOWED_DEV_ORIGINS.
  }

  try {
    const rawStatus = execFileSync("tailscale", ["status", "--json"], { encoding: "utf8", timeout: 1_000 });
    const status = JSON.parse(rawStatus) as { Self?: { DNSName?: string } };
    const dnsName = status.Self?.DNSName?.replace(/\.$/, "");
    if (dnsName) origins.add(dnsName);
  } catch {
    // Same optional Tailscale path as above.
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    ...splitOrigins(process.env.NEXT_ALLOWED_DEV_ORIGINS),
    ...detectedTailnetDevOrigins(),
  ],
  async headers() {
    return [
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
