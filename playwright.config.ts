import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 30_000,
  // The dev server compiles on demand and the holds scroll whole pages: more than two browsers
  // at once starve this machine and turn timing into timeouts.
  workers: process.env.CI ? undefined : 2,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  // On the machine's GPU: headless Chromium otherwise draws WebGL in software, where the
  // site rightly keeps the sprite device instead of the 3D hero.
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: { args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] },
      },
    },
  ],
  webServer: {
    command: "npx next dev -p 3100",
    url: "http://localhost:3100",
    env: { CONTENT_SOURCE: "fixtures", NEXT_DIST_DIR: ".next-e2e" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
