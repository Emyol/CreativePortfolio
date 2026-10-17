import { contentSchema } from "@/lib/content/schema";

const LISTS = new Set(["events", "music", "hobbies", "shelf", "people", "links"]);

/**
 * The tape's own rules, applied to the draft as visitors would get it (hidden entries left
 * out, as publishing does) and reported on the original fields: the first problem for each
 * field, keyed by its path ("events.0.photos.1.alt"; "music" for a list-wide rule).
 */
export function issuesByPath(content: unknown): Map<string, string> {
  const issues = new Map<string, string>();
  if (!content || typeof content !== "object") return issues;
  const raw = content as Record<string, unknown>;
  // For each list, where each visible entry sits in the full draft.
  const positions = new Map<string, number[]>();
  const visible: Record<string, unknown> = { ...raw };
  for (const key of LISTS) {
    if (!Array.isArray(raw[key])) continue;
    const kept: number[] = [];
    (raw[key] as { archived?: unknown }[]).forEach((item, i) => item?.archived !== true && kept.push(i));
    positions.set(key, kept);
    visible[key] = kept.map((i) => (raw[key] as unknown[])[i]);
  }
  const result = contentSchema.safeParse(visible);
  if (result.success) return issues;
  for (const issue of result.error.issues) {
    const path = [...issue.path];
    const map = positions.get(String(path[0]));
    if (map && typeof path[1] === "number") path[1] = map[path[1]] ?? path[1];
    const key = path.join(".");
    if (!issues.has(key)) issues.set(key, issue.message);
  }
  return issues;
}

/** An event's address from its name: lowercase ASCII words joined by hyphens. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
