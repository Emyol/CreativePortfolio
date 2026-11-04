import { test as base, type Page } from "@playwright/test";

export * from "@playwright/test";

type Logged = { text: string; url: string };

/**
 * Every test fails on a console error or an uncaught exception in any of its pages: the
 * `page` fixture's, and any page it opens itself (`browser.newContext()`, `browser.newPage()`),
 * which goes through the same guard. A test that provokes one on purpose (a 404, Spotify
 * blocked) names it with `allowConsole(text, from)`: both the message and the URL it came
 * from must match, so the allowance covers that one request and not every failure of its kind.
 */
export const test = base.extend<{ allowConsole: (text: RegExp, from: RegExp) => void; consoleGuard: void }>({
  allowConsole: [
    async ({}, use, info) => {
      await use((text, from) => info.annotations.push({ type: "allow-console", description: JSON.stringify([text.source, from.source]) }));
    },
    { scope: "test" },
  ],
  consoleGuard: [
    async ({ page, browser }, use, info) => {
      const errors: Logged[] = [];
      const guard = (p: Page) => {
        p.on("pageerror", (e) => errors.push({ text: `pageerror: ${e.message}`, url: p.url() }));
        p.on("console", (m) => m.type() === "error" && errors.push({ text: `console: ${m.text()}`, url: m.location().url || p.url() }));
      };
      guard(page);
      // Pages the test opens on its own contexts are watched too.
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...args) => {
        const context = await newContext(...args);
        context.on("page", guard);
        return context;
      };
      try {
        await use();
      } finally {
        browser.newContext = newContext;
      }
      const allowed = info.annotations
        .filter((a) => a.type === "allow-console")
        .map((a) => (JSON.parse(a.description ?? "[]") as [string, string]).map((s) => new RegExp(s)) as [RegExp, RegExp]);
      const left = errors.filter((e) => !allowed.some(([text, from]) => text.test(e.text) && from.test(e.url)));
      if (left.length) throw new Error(`console errors in the page:\n${left.map((e) => `${e.text} (from ${e.url})`).join("\n")}`);
    },
    { auto: true },
  ],
});
