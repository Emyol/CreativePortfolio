import { z } from "zod";
import { contentSchema, photoSchema, PROFESSIONAL_STACK, UPLOADED_PHOTO, withoutArchived, type Photo, type SiteContent } from "@/lib/content/schema";

/** Marks an uploaded photo as a draft: the browser loads it directly, with the owner's session. */
export const draft = (p: Photo): Photo => (UPLOADED_PHOTO.test(p.src) ? { ...p, src: `${p.src}?draft` } : p);

/**
 * The draft as visitors would get it once published: archived entries removed. Uploaded
 * photos skip the image optimizer, which fetches without the owner's cookie and so can't
 * see draft photos.
 */
export function previewContent(c: SiteContent): SiteContent {
  const out = withoutArchived(c);
  return {
    ...out,
    about: { ...out.about, candid: out.about.candid && draft(out.about.candid) },
    events: out.events.map((e) => ({ ...e, photos: e.photos.map(draft) })),
    hobbies: out.hobbies.map((h) => ({ ...h, photo: h.photo && draft(h.photo) })),
  };
}

const LISTS = ["events", "music", "hobbies", "shelf", "people", "links"] as const;

/** The schema for one entry of a list (unwrapping defaults and arrays). */
function entrySchema(key: (typeof LISTS)[number]): z.ZodType {
  let s = contentSchema.shape[key] as z.ZodType;
  if (s instanceof z.ZodDefault) s = s.unwrap() as z.ZodType;
  return (s as z.ZodArray<z.ZodType>).element;
}

/**
 * A draft the preview can always render: when it isn't valid yet, keep each entry that is
 * complete and leave the unfinished ones out (the editor still points at them). `hidden`
 * counts those, so the preview can say it isn't the whole draft.
 */
export function previewable(raw: unknown): { content: SiteContent; hidden: number } {
  const whole = contentSchema.safeParse(raw);
  if (whole.success) return { content: previewContent(whole.data), hidden: 0 };
  const r = (raw ?? {}) as Record<string, unknown>;
  const about = (r.about ?? {}) as Record<string, unknown>;
  const keep = (key: (typeof LISTS)[number]) => {
    const schema = entrySchema(key);
    return (Array.isArray(r[key]) ? r[key] : []).flatMap((item: unknown) => {
      const p = schema.safeParse(item);
      return p.success ? [p.data] : [];
    });
  };
  const events = keep("events").filter((e, i, all) => all.findIndex((x) => (x as { slug: string }).slug === (e as { slug: string }).slug) === i);
  const candidate = {
    about: {
      letter: (Array.isArray(about.letter) ? about.letter : []).filter((p): p is string => typeof p === "string" && p.trim() !== ""),
      candid: photoSchema.safeParse(about.candid).success ? about.candid : undefined,
      toolbox: (Array.isArray(about.toolbox) ? about.toolbox : []).filter((t) => (PROFESSIONAL_STACK as readonly unknown[]).includes(t)),
    },
    events,
    music: keep("music").slice(0, 12),
    hobbies: keep("hobbies"),
    shelf: keep("shelf"),
    people: keep("people"),
    links: keep("links").slice(0, 4),
  };
  const parsed = contentSchema.safeParse(candidate);
  const content = previewContent(parsed.success ? parsed.data : contentSchema.parse({ about: { letter: [], toolbox: [] }, events: [], music: [], hobbies: [], shelf: [], people: [] }));
  // Entries the owner hasn't hidden, minus the ones the preview shows.
  const wanted = LISTS.reduce((n, key) => n + (Array.isArray(r[key]) ? r[key].filter((i: { archived?: unknown }) => i?.archived !== true).length : 0), 0);
  const shown = LISTS.reduce((n, key) => n + content[key].length, 0);
  return { content, hidden: Math.max(0, wanted - shown) };
}
