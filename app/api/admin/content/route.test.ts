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

test("an unfinished draft still saves, so work in progress is never lost", async () => {
  const unfinished = { ...FIXTURES, events: [{ slug: "", name: "", date: "", summary: "", story: [], photos: [] }, ...FIXTURES.events] };
  const res = await put({ content: unfinished, revision: 7 });
  expect(res.status).toBe(200);
  expect(rpc.calls[0][1]).toMatchObject({ new_content: JSON.parse(JSON.stringify(unfinished)) });
});

test("anything that isn't a tape draft is refused", async () => {
  for (const content of [null, [], "x", { events: "nope" }]) {
    const res = await put({ content, revision: 1 });
    expect(res.status, JSON.stringify(content)).toBe(400);
  }
  expect(rpc.calls).toEqual([]);
});

test("an edit from a stale tab is a conflict, never an overwrite", async () => {
  rpc.error = { message: "revision_conflict" };
  const res = await put({ content: FIXTURES, revision: 3 });
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: "Saved somewhere else since. Reload to get the latest." });
});

test("a draft over the database's size limit, or a non-owner, gets its own answer", async () => {
  rpc.error = { message: "invalid_content" };
  expect((await put({ content: FIXTURES, revision: 1 })).status).toBe(413);
  rpc.error = { message: "forbidden" };
  expect((await put({ content: FIXTURES, revision: 1 })).status).toBe(403);
});
