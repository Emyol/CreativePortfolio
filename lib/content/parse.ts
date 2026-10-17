import { z } from "zod";
import { contentSchema, type SiteContent } from "./schema";

export function parseContent(raw: unknown, source: string): SiteContent {
  const result = contentSchema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid content in ${source}:\n${z.prettifyError(result.error)}`);
  return result.data;
}
