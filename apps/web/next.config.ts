import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // don't drop AGENTS.md / CLAUDE.md boilerplate into the repo on `next dev`
  agentRules: false,
  // The shared workspace package ships TypeScript source (poster engine, schemas) — let Next compile it.
  transpilePackages: ["@poster/shared"],
  // Workspace root so Turbopack can follow the symlinked @poster/shared package and hoisted node_modules.
  turbopack: { root: path.join(__dirname, "../..") },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/samples/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
