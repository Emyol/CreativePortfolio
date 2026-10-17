// @vitest-environment node
import { unzipSync, strFromU8 } from "fflate";
import { beforeEach, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({ names: [] as string[], size: 10, failDownload: false, hold: null as null | Promise<void> }));
vi.mock("@/lib/supabase/server", async (orig) => {
  const real = await orig<typeof import("@/lib/supabase/server")>();
  return {
    ...real,
    requireOwner: async () => ({
      from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { table }, error: null }) }) }) }),
      storage: {
        from: () => ({
          list: async (_: string, { limit, offset }: { limit: number; offset: number }) => ({
            data: state.names.slice(offset, offset + limit).map((name) => ({ name, metadata: { size: state.size } })),
            error: null,
          }),
          download: async (name: string) => {
            if (name === state.names.at(-1) && state.hold) await state.hold;
            return state.failDownload ? { data: null, error: { message: "gone" } } : { data: new Blob([`bytes of ${name}`]), error: null };
          },
        }),
      },
    }),
  };
});

import { GET } from "./route";

beforeEach(() => {
  state.names = ["a.webp", "b.jpg"];
  state.size = 10;
  state.failDownload = false;
  state.hold = null;
});

test("the backup streams a ZIP of the content and every photo", async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("application/zip");
  expect(res.body).toBeInstanceOf(ReadableStream);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  expect(Object.keys(files).sort()).toEqual(["README.txt", "assets/a.webp", "assets/b.jpg", "content.json"]);
  expect(strFromU8(files["assets/a.webp"])).toBe("bytes of a.webp");
  expect(JSON.parse(strFromU8(files["content.json"]))).toMatchObject({ version: 1, draft: { table: "tape_draft" }, published: { table: "tape_published" } });
});

test("the download starts before every photo is fetched, so a big backup isn't held in memory", async () => {
  let release!: () => void;
  state.hold = new Promise((r) => (release = r));
  const res = await Promise.race([GET(), new Promise<"waited">((r) => setTimeout(() => r("waited"), 200))]);
  release();
  expect(res).toBeInstanceOf(Response);
  expect(Object.keys(unzipSync(new Uint8Array(await (res as Response).arrayBuffer())))).toContain("assets/b.jpg");
});

test("more than a page of photos are all included", async () => {
  state.names = Array.from({ length: 150 }, (_, i) => `${String(i).padStart(3, "0")}.webp`);
  const files = unzipSync(new Uint8Array(await (await GET()).arrayBuffer()));
  expect(Object.keys(files).filter((k) => k.startsWith("assets/"))).toHaveLength(150);
});

test("photos over the web limit are refused up front, with the reason", async () => {
  state.size = 40 * 1024 * 1024;
  const res = await GET();
  expect(res.status).toBe(413);
  expect((await res.json()).error).toMatch(/64 MB/);
});

test("a photo that can't be fetched fails the download instead of leaving it out", async () => {
  state.failDownload = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  const res = await GET();
  await expect(res.arrayBuffer()).rejects.toThrow(/a\.webp/);
});
