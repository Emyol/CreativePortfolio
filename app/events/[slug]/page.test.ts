import { expect, test } from "vitest";
import * as page from "./page";

test("an event published after the build still gets its page", () => {
  // Without this, a slug not known at build time is a 404 until the next deploy.
  expect(page.dynamicParams).toBe(true);
  expect(page.revalidate).toBe(3600);
});
