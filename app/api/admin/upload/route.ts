import { randomUUID } from "node:crypto";
import { failure, json, sameOrigin } from "@/lib/supabase/http";
import { AdminError, requireOwner } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX = 4 * 1024 * 1024;
const EXTENSIONS: Record<string, "jpg" | "png" | "webp"> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function matches(ext: "jpg" | "png" | "webp", b: Uint8Array): boolean {
  if (ext === "jpg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === "png") return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

/** Owner-only photo upload into the private tape-assets bucket, under an immutable name. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const client = await requireOwner();
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size === 0) throw new AdminError("Choose a photo to upload.");
    const ext = EXTENSIONS[file.type];
    if (!ext) throw new AdminError("Supported photos: JPEG, PNG and WebP.");
    if (file.size > MAX) throw new AdminError("Choose a photo under 4 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matches(ext, bytes)) throw new AdminError("File contents do not match its type.");
    const path = `${randomUUID()}.${ext}`;
    const { error } = await client.storage.from("tape-assets").upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw new AdminError("Upload failed. Check the storage setup and free space.", 503);
    return json({ url: `/api/media/${path}` });
  } catch (e) {
    return failure(e);
  }
}
