// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

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

afterEach(() => vi.unstubAllEnvs());

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

test("with no secret configured, it fails loudly and nobody gets in", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("CRON_SECRET", "");
  delete process.env.CRON_SECRET;
  for (const auth of ["Bearer undefined", "Bearer ", undefined]) expect((await call(auth)).status).toBe(500);
  expect(db.calls).toBe(0);
  expect(String(log.mock.calls[0]?.[0])).toMatch(/CRON_SECRET/);
  log.mockRestore();
});

test("one cheap read keeps the project awake", async () => {
  const res = await call("Bearer s3cret");
  expect(await res.json()).toEqual({ ok: true });
  expect(db.calls).toBe(1);
});

test("a failing database is reported, not hidden", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  db.fail = true;
  const res = await call("Bearer s3cret");
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ ok: false });
  expect(log).toHaveBeenCalled();
  log.mockRestore();
});
