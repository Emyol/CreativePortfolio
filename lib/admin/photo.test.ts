import { afterEach, expect, test, vi } from "vitest";
import { fitWithin, PhotoError, prepareImage } from "./photo";

afterEach(() => vi.unstubAllGlobals());

test("photos shrink to 2400 px on the long side, keeping their shape", () => {
  expect(fitWithin(4032, 3024)).toEqual({ width: 2400, height: 1800 });
  expect(fitWithin(3024, 4032)).toEqual({ width: 1800, height: 2400 });
  expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
});

const canvasMaking = (type: string, size: number) => {
  const toBlob = vi.fn((cb: (b: Blob | null) => void, t: string) => cb(new Blob([new Uint8Array(t === "image/jpeg" ? 1000 : size)], { type: t === "image/jpeg" ? "image/jpeg" : type })));
  vi.spyOn(document, "createElement").mockImplementation(((tag: string) =>
    tag === "canvas" ? ({ width: 0, height: 0, getContext: () => ({ drawImage: () => {} }), toBlob }) : document.createElementNS("http://www.w3.org/1999/xhtml", tag)) as typeof document.createElement);
  return toBlob;
};

test("a photo the browser can't read gets a plain message", async () => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => Promise.reject(new Error("decode"))));
  await expect(prepareImage(new File(["x"], "a.heic"))).rejects.toEqual(new PhotoError("This photo can't be read here. Try a JPEG or PNG."));
});

test("a photo still over 4 MB after shrinking is refused", async () => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4000, height: 3000, close() {} })));
  canvasMaking("image/webp", 4 * 1024 * 1024 + 1);
  await expect(prepareImage(new File(["x"], "a.jpg"))).rejects.toEqual(new PhotoError("This photo is still over 4 MB after shrinking."));
  vi.restoreAllMocks();
});

test("shrinks to WebP, the right way up, and reports the new size", async () => {
  const bitmap = vi.fn(async () => ({ width: 4032, height: 3024, close() {} }));
  vi.stubGlobal("createImageBitmap", bitmap);
  const toBlob = canvasMaking("image/webp", 300_000);
  const out = await prepareImage(new File(["x"], "a.jpg"));
  expect(bitmap).toHaveBeenCalledWith(expect.any(File), { imageOrientation: "from-image" });
  expect(toBlob.mock.calls[0].slice(1)).toEqual(["image/webp", 0.82]);
  expect(out).toMatchObject({ width: 2400, height: 1800 });
  expect(out.blob.type).toBe("image/webp");
  vi.restoreAllMocks();
});

test("where the browser can't make WebP (older Safari), it falls back to JPEG", async () => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1000, height: 1000, close() {} })));
  const toBlob = canvasMaking("image/png", 5_000_000);
  const out = await prepareImage(new File(["x"], "a.jpg"));
  expect(toBlob.mock.calls.map((c) => c[1])).toEqual(["image/webp", "image/jpeg"]);
  expect(out.blob.type).toBe("image/jpeg");
  vi.restoreAllMocks();
});
