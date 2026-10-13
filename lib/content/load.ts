import { z } from "zod";
import { contentSchema, type SiteContent } from "./schema";
import seed from "./seed.json";

export function parseContent(raw: unknown, source: string): SiteContent {
  const result = contentSchema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid content in ${source}:\n${z.prettifyError(result.error)}`);
  return result.data;
}

export async function getContent(): Promise<SiteContent> {
  if (process.env.CONTENT_SOURCE === "fixtures") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CONTENT_SOURCE=fixtures is for development only. Unset it before building.");
    }
    // Dynamic import keeps fixtures out of the production module graph.
    const { FIXTURES } = await import("./fixtures");
    return parseContent(FIXTURES, "lib/content/fixtures.ts");
  }
  return parseContent(seed, "lib/content/seed.json");
}
