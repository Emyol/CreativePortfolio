import { chromium } from "@playwright/test";

// The dev server compiles routes on first request, and the client's chunks (three.js and
// the model's loaders among them) on first load in a browser: warm both, so the first tests
// measure the site, not the compiler.
export default async function globalSetup() {
  const base = "http://localhost:3100";
  for (const path of ["/", "/events/fixture-event-1", "/tracklist"]) {
    await fetch(base + path).catch(() => undefined);
  }
  const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/#top`);
    await page.waitForSelector("[data-hero][data-3d], [data-hero][data-fallback]", { state: "attached", timeout: 60_000 }).catch(() => undefined);
  } finally {
    await browser.close();
  }
}
