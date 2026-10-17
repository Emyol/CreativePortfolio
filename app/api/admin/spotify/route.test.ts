// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", async (orig) => ({ ...(await orig<typeof import("@/lib/supabase/server")>()), requireOwner: async () => ({}) }));

import { GET } from "./route";

const TRACK = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC";
const get = (url: string) => GET(new Request(`https://tape.test/api/admin/spotify?url=${encodeURIComponent(url)}`));
afterEach(() => vi.unstubAllGlobals());

test("only track links are looked up", async () => {
  expect((await get("https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC")).status).toBe(400);
});

test("a track's title and artist come back", async () => {
  vi.stubGlobal("fetch", vi.fn(async (u: string) => (u.includes("oembed") ? Response.json({ title: "lowkey" }) : new Response('<meta property="og:description" content="NIKI · Song · 2022">'))));
  expect(await (await get(TRACK)).json()).toEqual({ title: "lowkey", artist: "NIKI" });
});

test("if Spotify doesn't answer, the fields are left for typing", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
  const res = await get(TRACK);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({});
});
