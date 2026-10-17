import { zipSync, strToU8 } from "fflate";
import { requireOwner, AdminError } from "@/lib/supabase/server";
import { failure } from "@/lib/supabase/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const client = await requireOwner();
    const [draft, published] = await Promise.all([
      client.from("tape_draft").select("*").eq("id", 1).maybeSingle(),
      client.from("tape_published").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (draft.error || published.error)
      throw new AdminError("Couldn't read the tape for the backup.", 503);
    const files: Record<string, Uint8Array> = {};
    let offset = 0,
      total = 0;
    while (true) {
      const { data, error } = await client.storage
        .from("tape-assets")
        .list("", {
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw new AdminError("Couldn't list the photos for the backup.", 503);
      for (const item of data || []) {
        total += Number(item.metadata?.size || 0);
        if (total > 64 * 1024 * 1024)
          throw new AdminError(
            "The photos are over the 64 MB web backup limit. Use the storage backup steps in docs/admin-setup.md.",
            413,
          );
        const result = await client.storage
          .from("tape-assets")
          .download(item.name);
        if (result.error || !result.data)
          throw new AdminError(
            "A photo couldn't be downloaded. Try the backup again.",
            503,
          );
        files[`assets/${item.name}`] = new Uint8Array(
          await result.data.arrayBuffer(),
        );
      }
      if (!data || data.length < 100) break;
      offset += 100;
    }
    files["content.json"] = strToU8(
      JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          draft: draft.data,
          published: published.data,
        },
        null,
        2,
      ),
    );
    files["README.txt"] = strToU8(
      "Restore with docs/admin-setup.md in the CreativePortfolioV2 repository. assets/ holds every photo uploaded in the admin, including unused drafts. Static files stay in the Git repository. Owner identities, auth secrets and OAuth settings are not exported.",
    );
    return new Response(new Uint8Array(zipSync(files, { level: 0 })).buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="tape-backup.zip"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
