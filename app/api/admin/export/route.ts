import { Zip, ZipPassThrough, strToU8 } from "fflate";
import { requireOwner, AdminError } from "@/lib/supabase/server";
import { failure } from "@/lib/supabase/http";
export const runtime = "nodejs";

const LIMIT = 64 * 1024 * 1024;
const README =
  "Restore with docs/admin-setup.md in the CreativePortfolioV2 repository. assets/ holds every photo uploaded in the admin, including unused drafts. Static files stay in the Git repository. Owner identities, auth secrets and OAuth settings are not exported.";

/**
 * A ZIP of the draft, the published tape and every uploaded photo. Everything that can be
 * refused (sign-in, the size limit) is checked before the download starts; then photos
 * are fetched one at a time and streamed out, so the backup is never held whole in memory
 * (and isn't capped by Vercel's 4.5 MB limit on buffered responses).
 */
export async function GET() {
  let client: Awaited<ReturnType<typeof requireOwner>>;
  let draft: unknown, published: unknown;
  const names: string[] = [];
  try {
    client = await requireOwner();
    const [d, p] = await Promise.all([
      client.from("tape_draft").select("*").eq("id", 1).maybeSingle(),
      client.from("tape_published").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (d.error || p.error) throw new AdminError("Couldn't read the tape for the backup.", 503, { cause: d.error ?? p.error });
    draft = d.data;
    published = p.data;
    let total = 0;
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client.storage
        .from("tape-assets")
        .list("", { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new AdminError("Couldn't list the photos for the backup.", 503, { cause: error });
      for (const item of data ?? []) {
        total += Number(item.metadata?.size || 0);
        if (total > LIMIT)
          throw new AdminError(
            "The photos are over the 64 MB web backup limit. Use the storage backup steps in docs/admin-setup.md.",
            413,
          );
        names.push(item.name);
      }
      if (!data || data.length < 100) break;
    }
  } catch (e) {
    return failure(e);
  }

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((err, chunk, final) => {
        if (err) return controller.error(err);
        controller.enqueue(chunk);
        if (final) controller.close();
      });
      const add = (name: string, bytes: Uint8Array) => {
        const file = new ZipPassThrough(name); // photos are already compressed
        zip.add(file);
        file.push(bytes, true);
      };
      try {
        add("content.json", strToU8(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), draft, published }, null, 2)));
        add("README.txt", strToU8(README));
        for (const name of names) {
          const result = await client.storage.from("tape-assets").download(name);
          if (result.error || !result.data) throw new Error(`Couldn't download ${name} for the backup`, { cause: result.error });
          add(`assets/${name}`, new Uint8Array(await result.data.arrayBuffer()));
        }
        zip.end();
      } catch (e) {
        // The download has started, so the owner sees it fail; the log says which photo.
        console.error("[admin]", e instanceof Error ? e.message : e, e instanceof Error ? (e.cause ?? "") : "");
        zip.terminate();
        controller.error(e);
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="tape-backup.zip"',
      "Cache-Control": "private, no-store",
    },
  });
}
