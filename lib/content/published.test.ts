import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FIXTURES } from "./fixtures";
import seed from "./seed.json";

const db = vi.hoisted(() => ({ row: null as null | { content: unknown }, fail: false }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock("@/lib/supabase/server", async (orig) => {
  const real = await orig<typeof import("@/lib/supabase/server")>();
  return {
    ...real,
    publicClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => (db.fail ? { data: null, error: { message: "paused" } } : { data: db.row, error: null }) }),
        }),
      }),
    }),
  };
});

import { getContent, parseContent } from "./load";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  db.row = null;
  db.fail = false;
});
afterEach(() => vi.unstubAllEnvs());

test("the published row is what visitors get", async () => {
  db.row = { content: FIXTURES };
  expect((await getContent()).events).toHaveLength(FIXTURES.events.length);
});

test("before anything is published, the tape is the seed", async () => {
  expect(await getContent()).toEqual(parseContent(seed, "seed.json"));
});

test("not configured (local dev, CI) the tape is the seed", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  db.fail = true;
  expect(await getContent()).toEqual(parseContent(seed, "seed.json"));
});

test("a failing Supabase throws instead of quietly serving the seed, so ISR keeps the last good page", async () => {
  db.fail = true;
  await expect(getContent()).rejects.toThrow(/Supabase/);
});

test("a production build refuses to replace a publication with the seed", async () => {
  db.fail = true;
  vi.stubEnv("NEXT_PHASE", "phase-production-build");
  await expect(getContent()).rejects.toThrow("Supabase is unreachable: refusing to build the tape from the seed");
});

test("published content that no longer fits the schema fails loudly", async () => {
  db.row = { content: { ...FIXTURES, music: "nope" } };
  await expect(getContent()).rejects.toThrow(/music/);
});
