const LONG_EDGE = 2400;
const QUALITY = 0.82;
const MAX_BYTES = 4 * 1024 * 1024;

export class PhotoError extends Error {}

export function fitWithin(width: number, height: number, max = LONG_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * A phone photo, ready to upload: decoded the right way up (EXIF orientation), scaled so
 * its long edge is at most 2400 px, and encoded as WebP (JPEG where the browser can't
 * make WebP, as older Safari can't). Returns the size the schema needs.
 */
export async function prepareImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("This photo can't be read here. Try a JPEG or PNG.");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  let blob = await encode(canvas, "image/webp", QUALITY);
  if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", 0.85);
  if (!blob) throw new PhotoError("This photo can't be read here. Try a JPEG or PNG.");
  if (blob.size > MAX_BYTES) throw new PhotoError("This photo is still over 4 MB after shrinking.");
  return { blob, width, height };
}

/** Uploads to the private bucket, reporting progress (0 to 1); resolves with the photo's path. */
export function uploadPhoto(blob: Blob, onProgress: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { url?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }
      if (xhr.status === 200 && body.url) resolve(body.url);
      else reject(new PhotoError(body.error ?? "Upload failed. Try again."));
    };
    xhr.onerror = () => reject(new PhotoError("Couldn't reach the server. Check the connection and try again."));
    const form = new FormData();
    form.set("file", blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
    xhr.send(form);
  });
}
