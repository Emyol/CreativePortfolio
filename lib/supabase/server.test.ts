import { afterEach, beforeEach, expect, test, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: null as null | { id: string }, owner: false, error: null as unknown }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: auth.user }, error: auth.error }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            expect(table).toBe("tape_admin_users");
            return { data: auth.owner ? { user_id: auth.user?.id } : null, error: null };
          },
        }),
      }),
    }),
  }),
}));

import { getAdminStatus } from "./server";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  auth.user = null;
  auth.owner = false;
  auth.error = null;
});
afterEach(() => vi.unstubAllEnvs());

test("without Supabase configured the admin explains setup", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect((await getAdminStatus()).status).toBe("setup");
});

test("signed out, then signed in as someone else, then as the owner", async () => {
  expect((await getAdminStatus()).status).toBe("signed-out");
  auth.user = { id: "u1" };
  expect((await getAdminStatus()).status).toBe("forbidden");
  auth.owner = true;
  expect((await getAdminStatus()).status).toBe("ready");
});

test("fixtures make the admin ready in development only", async () => {
  vi.stubEnv("CONTENT_SOURCE", "fixtures");
  vi.stubEnv("NODE_ENV", "development");
  expect((await getAdminStatus()).status).toBe("ready");
  vi.stubEnv("NODE_ENV", "production");
  expect((await getAdminStatus()).status).toBe("signed-out");
});

test("an unreachable auth service is an outage, not a sign-out", async () => {
  const { AuthRetryableFetchError } = await import("@supabase/supabase-js");
  auth.error = new AuthRetryableFetchError("fetch failed", 0);
  const state = await getAdminStatus();
  expect(state.status).toBe("error");
  expect(state.message).toBe("Couldn't reach the database. Try again in a moment.");
});

test("a missing session is a sign-out", async () => {
  const { AuthSessionMissingError } = await import("@supabase/supabase-js");
  auth.error = new AuthSessionMissingError();
  expect((await getAdminStatus()).status).toBe("signed-out");
});
