import "server-only";
import { unstable_cache } from "next/cache";
import { AdminError, fixturesMode, publicClient, requireOwner } from "@/lib/supabase/server";
import { parseContent } from "./parse";
import type { SiteContent } from "./schema";
import seed from "./seed.json";

/** Publishing revalidates this tag, so a publish is live within seconds. */
export const TAPE_TAG = "tape-content";

/** The published tape, or null if nothing has been published yet. Throws when Supabase fails. */
export const readPublished = unstable_cache(
  async (): Promise<SiteContent | null> => {
    const { data, error } = await publicClient().from("tape_published").select("content").eq("id", 1).maybeSingle();
    if (error) throw new Error(`Supabase did not return the published tape: ${error.message}`);
    return data ? parseContent(data.content, "tape_published") : null;
  },
  ["tape-published-v1"],
  { revalidate: 3600, tags: [TAPE_TAG] },
);

export async function getDraft(): Promise<{ content: SiteContent; revision: number }> {
  if (fixturesMode()) {
    const { FIXTURES } = await import("./fixtures");
    return { content: FIXTURES, revision: 1 };
  }
  const client = await requireOwner();
  const { data, error } = await client.from("tape_draft").select("content,revision").eq("id", 1).maybeSingle();
  if (error) throw new AdminError("Couldn't load the draft. Check the database setup.", 503, { cause: error });
  return data
    ? { content: data.content as SiteContent, revision: data.revision as number }
    : { content: parseContent(seed, "seed.json"), revision: 0 };
}
