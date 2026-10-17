// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({ ownerChecks: 0 }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: () => {}, revalidatePath: () => {} }));
vi.mock("@/lib/supabase/server", async (orig) => {
  const real = await orig<typeof import("@/lib/supabase/server")>();
  const signedOut = async () => {
    state.ownerChecks++;
    throw new real.AdminError("Sign in again.", 401);
  };
  return { ...real, requireOwner: signedOut, serverClient: signedOut };
});

import { PUT as saveDraft } from "@/app/api/admin/content/route";
import { POST as publish } from "@/app/api/admin/publish/route";
import { POST as upload } from "@/app/api/admin/upload/route";
import { POST as logout } from "@/app/auth/logout/route";

const ROUTES = [
  ["saving the draft", saveDraft, "PUT", "/api/admin/content"],
  ["publishing", publish, "POST", "/api/admin/publish"],
  ["uploading a photo", upload, "POST", "/api/admin/upload"],
  ["signing out", logout, "POST", "/auth/logout"],
] as const;

const call = (handler: (r: Request) => Promise<Response>, method: string, path: string, origin: string | null) =>
  handler(new Request(`https://tape.test${path}`, { method, headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: "{}" }));

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://tape.test");
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.ownerChecks = 0;
});

test.each(ROUTES)("%s from another site is refused before anything else", async (_, handler, method, path) => {
  for (const origin of ["https://evil.test", null]) {
    expect((await call(handler, method, path, origin)).status).toBe(403);
  }
  expect(state.ownerChecks).toBe(0);
});

test.each(ROUTES)("%s from the tape itself gets past the origin check", async (_, handler, method, path) => {
  expect((await call(handler, method, path, "https://tape.test")).status).toBe(401);
  expect(state.ownerChecks).toBe(1);
});
