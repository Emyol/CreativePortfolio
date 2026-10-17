import { supabaseConfig } from "@/lib/supabase/server";
import { parseContent } from "./parse";
import { readPublished } from "./repository";
import type { SiteContent } from "./schema";
import seed from "./seed.json";

export { parseContent };

/**
 * The tape visitors see. Fixtures in development; the repo seed when Supabase isn't
 * configured (local dev, CI); otherwise the published row, or the seed until the first
 * publish. A failing Supabase throws rather than falling back: pages are ISR, so a failed
 * regeneration keeps serving the last good render instead of an empty tape.
 */
export async function getContent(): Promise<SiteContent> {
  if (process.env.CONTENT_SOURCE === "fixtures") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CONTENT_SOURCE=fixtures is for development only. Unset it before building.");
    }
    // Dynamic import keeps fixtures out of the production module graph.
    const { FIXTURES } = await import("./fixtures");
    return parseContent(FIXTURES, "lib/content/fixtures.ts");
  }
  if (!supabaseConfig()) {
    // Local dev, CI and unconfigured previews use the seed; production never should: a lost
    // env var would otherwise replace the published tape with two links.
    if (process.env.VERCEL_ENV === "production") throw new Error("Supabase settings are missing in production: refusing to serve the seed");
    return parseContent(seed, "lib/content/seed.json");
  }
  try {
    return (await readPublished()) ?? parseContent(seed, "lib/content/seed.json");
  } catch (e) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      throw new Error("Supabase is unreachable: refusing to build the tape from the seed", { cause: e });
    }
    throw e;
  }
}
