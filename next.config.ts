import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The e2e server builds into its own folder, so tests run while a dev server is open.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // The plain index lived at /mokuroku under Kakejiku; keep old links working.
  redirects() {
    return [{ source: "/mokuroku", destination: "/tracklist", permanent: true }];
  },
};

export default nextConfig;
