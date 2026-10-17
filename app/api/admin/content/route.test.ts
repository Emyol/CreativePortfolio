// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";

const rpc = vi.hoisted(() => ({ calls: [] as [string, unknown][], error: null as null | { message: string } }));
vi.mock("@/lib/supabase/server", async (orig) => {
  const real = await orig<typeof import("@/lib/supabase/server")>();
  return { ...real, requireOwner: async () => ({ rpc: async (fn: string, args: unknown) => (rpc.calls.push([fn, args]), rpc.error ? { data: null, error: rpc.error } : { data: 8, error: null }) }) };
});

import { PUT } from "./route";

const put = (body: unknown) =>
  PUT(new Request("https://tape.test/api/admin/content", { method: "PUT", body: JSON.stringify(body), headers: { origin: "https://tape.test", "content-type": "application/json" } }));

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://tape.test");
  rpc.calls = [];
  rpc.error = null;
});

test("valid content is saved against the revision it was edited from", async () => {
  const res = await put({ content: FIXTURES, revision: 7 });
  expect(await res.json()).toEqual({ revision: 8 });
  expect(rpc.calls[0][0]).toBe("save_tape_draft");
  expect(rpc.calls[0][1]).toMatchObject({ expected_revision: 7 });
});

test("content the tape would refuse is not saved, and the field is named", async () => {
  const bad = { ...FIXTURES, events: [{ ...FIXTURES.events[0], photos: [{ ...FIXTURES.events[0].photos[0], alt: "" }] }] };
  const res = await put({ content: bad, revision: 7 });
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "every photo needs alt text", path: ["events", 0, "photos", 0, "alt"] });
  expect(rpc.calls).toEqual([]);
});

test("a duplicate event slug is refused", async () => {
  const res = await put({ content: { ...FIXTURES, events: [FIXTURES.events[0], FIXTURES.events[0]] }, revision: 1 });
  expect((await res.json()).error).toMatch(/duplicate event slug/);
});

test("an edit from a stale tab is a conflict, never an overwrite", async () => {
  rpc.error = { message: "revision_conflict" };
  const res = await put({ content: FIXTURES, revision: 3 });
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: "Saved somewhere else since. Reload to get the latest." });
});
