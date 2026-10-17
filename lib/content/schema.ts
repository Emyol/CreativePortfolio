import { z } from "zod";
import { formatDate } from "@/lib/dates";

/** From docs/reference/professional-inventory.md. The toolbox may only use these. */
export const PROFESSIONAL_STACK = [
  "Python", "TypeScript", "Dart", "Kotlin", "C / C++",
  "Flutter", "Next.js", "ONNX Runtime", "REST APIs",
  "On-device ML", "Vector retrieval", "Geospatial", "Compilers",
  "Git", "SAP Activate", "Agile / Scrum", "Claude Code",
] as const;

/** A phone number never goes on the tape (CLAUDE.md content rules); the admin refuses one as it is typed. */
export const PHONE = /tel:|\+63|\b09\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/;
const noPhone = (t: string) => !PHONE.test(t);
const NO_PHONE = "phone numbers stay off the tape";
const text = z.string().trim().min(1).refine(noPhone, NO_PHONE);
/** Hides an entry from the tape without deleting it; stripped from what visitors get at publish. */
const archived = z.boolean().optional();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case, e.g. pycon-ph-2025");
const date = z.string().refine((d) => {
  try {
    formatDate(d);
    return true;
  } catch {
    return false;
  }
}, "date must be a real YYYY, YYYY-MM or YYYY-MM-DD");
const link = z.url();

/** A photo uploaded in the admin: an immutable name in the tape-assets bucket, served by /api/media. */
export const UPLOADED_PHOTO = /^\/api\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/;

export const photoSchema = z.object({
  // Uploaded photos (/api/media/...) or static ones under public/ (/photos/x.jpg). data: is for fixtures only.
  src: z.string().refine((s) => UPLOADED_PHOTO.test(s) || s.startsWith("/") || s.startsWith("data:image/"), "photo src must be an uploaded photo or a path under public/, e.g. /photos/x.jpg"),
  alt: z.string().trim().min(1, "every photo needs alt text").refine(noPhone, NO_PHONE),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

// Songs play inside the site through Spotify's embed, so each needs a track link.
const spotifyTrack = z.string().regex(/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}(\?.*)?$/, "spotify must be an open.spotify.com track link");

export const musicSongSchema = z.object({ title: text, artist: text, spotify: spotifyTrack, note: text.optional(), archived });

export const eventSchema = z.object({
  slug,
  name: text,
  date,
  place: text.optional(),
  summary: text,
  story: z.array(text).default([]),
  photos: z.array(photoSchema).min(1, "an event needs at least one photo"),
  archived,
});

export const contentSchema = z.object({
  about: z.object({
    letter: z.array(text),
    candid: photoSchema.optional(),
    toolbox: z.array(z.enum(PROFESSIONAL_STACK)),
  }),
  events: z.array(eventSchema).superRefine((events, ctx) => {
    const seen = new Set<string>();
    for (const e of events) {
      if (seen.has(e.slug)) ctx.addIssue({ code: "custom", message: `duplicate event slug "${e.slug}"` });
      seen.add(e.slug);
    }
  }),
  music: z.array(musicSongSchema).max(12, "a mixtape holds at most 12 songs"),
  hobbies: z.array(z.object({ name: text, note: text, photo: photoSchema.optional(), link: link.optional(), archived })),
  shelf: z.array(z.object({ title: text, kind: z.enum(["manga", "game", "anime"]), note: text, archived })),
  people: z.array(z.object({ name: text, relation: text, note: text.optional(), link: link.optional(), archived })),
  // Shown on the back of the device. No email and no phone number.
  links: z.array(z.object({ label: text, url: z.url().startsWith("https://", "links must be https"), archived })).max(4).default([]),
});

export type SiteContent = z.output<typeof contentSchema>;

/**
 * What a saved draft must at least be: the tape's shape, its fields still being filled in.
 * Autosave keeps unfinished work; publishing requires the full contentSchema.
 */
export const draftSchema = z
  .object({
    about: z.looseObject({ letter: z.array(z.unknown()), toolbox: z.array(z.unknown()) }),
    events: z.array(z.looseObject({})),
    music: z.array(z.looseObject({})),
    hobbies: z.array(z.looseObject({})),
    shelf: z.array(z.looseObject({})),
    people: z.array(z.looseObject({})),
    links: z.array(z.looseObject({})).default([]),
  })
  .loose();

const LISTS = ["events", "music", "hobbies", "shelf", "people", "links"] as const;

/** What visitors get: archived entries removed from every list (as publish_tape does in SQL). */
export function withoutArchived(c: SiteContent): SiteContent {
  const out = { ...c };
  for (const key of LISTS) (out[key] as { archived?: boolean }[]) = (c[key] as { archived?: boolean }[]).filter((item) => !item.archived);
  return out;
}
export type Photo = z.output<typeof photoSchema>;
export type EventItem = z.output<typeof eventSchema>;
export type About = SiteContent["about"];
export type MixtapeSong = SiteContent["music"][number];
export type FooterLink = SiteContent["links"][number];
export type Hobby = SiteContent["hobbies"][number];
export type ShelfItem = SiteContent["shelf"][number];
export type Person = SiteContent["people"][number];
