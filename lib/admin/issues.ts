import { contentSchema } from "@/lib/content/schema";

/**
 * The tape's own rules, applied to the draft as it is typed: the first problem for each
 * field, keyed by its path ("events.0.photos.1.alt"; "music" for a list-wide rule).
 */
export function issuesByPath(content: unknown): Map<string, string> {
  const issues = new Map<string, string>();
  const result = contentSchema.safeParse(content);
  if (result.success) return issues;
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!issues.has(key)) issues.set(key, issue.message);
  }
  return issues;
}

/** An event's address from its name: lowercase ASCII words joined by hyphens. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
