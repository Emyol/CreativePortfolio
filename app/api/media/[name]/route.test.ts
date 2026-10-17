// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const store = vi.hoisted(() => ({ published: new Set<string>(), files: new Map<string, Blob>(), owner: false }));
const bucket = (asOwner: boolean) => ({
  download: async (name: string) => {
    const file = store.files.get(name);
    return file && (asOwner || store.published.has(name)) ? { data: file, error: null } : { data: null, error: { message: "not found" } };
  },
});
vi.mock("@/lib/supabase/server", () => ({
  publicClient: () => ({
    from: () => ({ select: () => ({ eq: (_c: string, name: string) => ({ maybeSingle: async () => ({ data: store.published.has(name) ? { name } : null }) }) }) }),
    storage: { from: () => bucket(false) },
  }),
  serverClient: async () => ({ storage: { from: () => bucket(store.owner) } }),
}));

import { GET } from "./route";

const NAME = "0b0e5c3c-1f2a-4b3c-9d8e-123456789abc.webp";
const get = (name: string) => GET(new Request(`https://tape.test/api/media/${name}`), { params: Promise.resolve({ name }) });

beforeEach(() => {
  store.published.clear();
  store.files.clear();
  store.owner = false;
  store.files.set(NAME, new Blob(["x"], { type: "image/webp" }));
});

test("anything that isn't an uploaded photo name is a 404", async () => {
  for (const name of ["../secret", "x.pdf", "0b0e5c3c-1f2a-4b3c-9d8e-123456789abc.svg"]) expect((await get(name)).status).toBe(404);
});

test("a published photo is served for the CDN to keep", async () => {
  store.published.add(NAME);
  const res = await get(NAME);
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  expect(res.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
});

test("a draft photo is a 404 when signed out and private for the owner", async () => {
  expect((await get(NAME)).status).toBe(404);
  store.owner = true;
  const res = await get(NAME);
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("private, no-store");
});
