// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({ error: null as null | { message: string }, tags: [] as unknown[], paths: [] as unknown[], draft: null as unknown }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: (...a: unknown[]) => state.tags.push(a),
  revalidatePath: (...a: unknown[]) => state.paths.push(a),
}));
vi.mock("@/lib/supabase/server", async (orig) => {
  const real = await orig<typeof import("@/lib/supabase/server")>();
  return {
    ...real,
    requireOwner: async () => ({
      rpc: async () => ({ data: null, error: state.error }),
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { content: state.draft, revision: 4 }, error: null }) }) }) }),
    }),
  };
});

import { FIXTURES } from "@/lib/content/fixtures";
import { POST } from "./route";

const publish = (revision: unknown) =>
  POST(new Request("https://tape.test/api/admin/publish", { method: "POST", body: JSON.stringify({ revision }), headers: { origin: "https://tape.test", "content-type": "application/json" } }));

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://tape.test");
  state.error = null;
  state.tags = [];
  state.paths = [];
  state.draft = FIXTURES;
});

test("a draft the tape would refuse is not published, and the reason is given", async () => {
  state.draft = { ...FIXTURES, events: [{ ...FIXTURES.events[0], photos: [] }] };
  const res = await publish(4);
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "Fix this first: an event needs at least one photo", path: ["events", 0, "photos"] });
  expect(state.tags).toEqual([]);
});

test("publishing makes the tape live at once", async () => {
  expect(await (await publish(4)).json()).toEqual({ published: true });
  expect(state.tags).toEqual([["tape-content", { expire: 0 }]]);
  expect(state.paths).toEqual([["/"], ["/tracklist"], ["/events/[slug]", "page"]]);
});

test("nothing is published before a save", async () => {
  expect((await publish(0)).status).toBe(400);
});

test("a draft changed elsewhere is a conflict", async () => {
  state.error = { message: "revision_conflict" };
  const res = await publish(4);
  expect(res.status).toBe(409);
  expect(state.tags).toEqual([]);
});

test("a photo missing from storage stops the publish with a reason", async () => {
  state.error = { message: "missing_asset" };
  const res = await publish(4);
  expect(res.status).toBe(500);
  expect(await res.json()).toEqual({ error: "Couldn't publish: a photo in the draft is missing." });
});

test("a hidden unfinished entry doesn't stop the publish", async () => {
  state.draft = { ...FIXTURES, events: [{ slug: "", name: "Half", date: "", summary: "", story: [], photos: [], archived: true }, ...FIXTURES.events] };
  expect((await publish(4)).status).toBe(200);
});
