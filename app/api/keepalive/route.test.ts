// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({ calls: 0, fail: false }));
vi.mock("@/lib/supabase/server", async (orig) => ({
  ...(await orig<typeof import("@/lib/supabase/server")>()),
  publicClient: () => ({
    from: (table: string) => ({
      select: () => ({
        limit: async () => {
          db.calls++;
          expect(table).toBe("tape_published");
          return db.fail ? { data: null, error: { message: "down" } } : { data: [], error: null };
        },
      }),
    }),
  }),
}));

import { GET } from "./route";

const call = (auth?: string) => GET(new Request("https://tape.test/api/keepalive", { headers: auth ? { authorization: auth } : {} }));

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "s3cret");
  db.calls = 0;
  db.fail = false;
});

test("only Vercel Cron, with the secret, can wake the database", async () => {
  expect((await call()).status).toBe(401);
  expect((await call("Bearer nope")).status).toBe(401);
  expect(db.calls).toBe(0);
});

test("with no secret configured, nobody can", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await call("Bearer ")).status).toBe(401);
});

test("one cheap read keeps the project awake", async () => {
  const res = await call("Bearer s3cret");
  expect(await res.json()).toEqual({ ok: true });
  expect(db.calls).toBe(1);
});

test("a failing database is reported, not hidden", async () => {
  db.fail = true;
  const res = await call("Bearer s3cret");
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ ok: false });
});
