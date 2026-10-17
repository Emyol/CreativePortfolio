import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The plain index lived at /mokuroku under Kakejiku; keep old links working.
  redirects() {
    return [{ source: "/mokuroku", destination: "/tracklist", permanent: true }];
  },
};

export default nextConfig;
