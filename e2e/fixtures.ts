import { test as base } from "@playwright/test";

export * from "@playwright/test";

/**
 * Every test fails on a console error or an uncaught exception in the page. A test that
 * provokes one on purpose (a 404, Spotify blocked) names it with `allowConsole`.
 */
export const test = base.extend<{ allowConsole: (pattern: RegExp) => void; consoleGuard: void }>({
  allowConsole: [
    async ({}, use, info) => {
      await use((pattern) => info.annotations.push({ type: "allow-console", description: pattern.source }));
    },
    { scope: "test" },
  ],
  consoleGuard: [
    async ({ page }, use, info) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
      await use();
      const allowed = info.annotations.filter((a) => a.type === "allow-console").map((a) => new RegExp(a.description ?? ""));
      const left = errors.filter((e) => !allowed.some((p) => p.test(e)));
      if (left.length) throw new Error(`console errors in the page:\n${left.join("\n")}`);
    },
    { auto: true },
  ],
});
