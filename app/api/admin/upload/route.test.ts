// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const up = vi.hoisted(() => ({ calls: [] as { path: string; type: string }[] }));
vi.mock("@/lib/supabase/server", async (orig) => {
  const real = await orig<typeof import("@/lib/supabase/server")>();
  return {
    ...real,
    requireOwner: async () => ({
      storage: { from: () => ({ upload: async (path: string, _b: unknown, o: { contentType: string }) => (up.calls.push({ path, type: o.contentType }), { error: null }) }) },
    }),
  };
});

import { POST } from "./route";

const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2, 3]);
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
const send = (bytes: Uint8Array, type: string, size?: number) => {
  const form = new FormData();
  const file = new File([size ? new Uint8Array(size) : bytes], "p", { type });
  form.set("file", file);
  return POST(new Request("https://tape.test/api/admin/upload", { method: "POST", body: form, headers: { origin: "https://tape.test" } }));
};

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://tape.test");
  up.calls = [];
});

test("only photos are accepted", async () => {
  const res = await send(new TextEncoder().encode("%PDF-1.7"), "application/pdf");
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "Supported photos: JPEG, PNG and WebP." });
});

test("a photo over 4 MB is refused", async () => {
  const res = await send(WEBP, "image/webp", 4 * 1024 * 1024 + 1);
  expect(await res.json()).toEqual({ error: "Choose a photo under 4 MB." });
});

test("the bytes must match the declared type", async () => {
  const res = await send(PNG, "image/webp");
  expect(await res.json()).toEqual({ error: "File contents do not match its type." });
});

test("a WebP is stored under an immutable name and returned as a media path", async () => {
  const res = await send(WEBP, "image/webp");
  const { url } = await res.json();
  expect(url).toMatch(/^\/api\/media\/[a-f0-9-]{36}\.webp$/);
  expect(up.calls).toEqual([{ path: url.replace("/api/media/", ""), type: "image/webp" }]);
});
