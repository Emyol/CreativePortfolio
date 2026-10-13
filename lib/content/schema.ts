import { z } from "zod";
import { formatDate } from "@/lib/dates";

/** From docs/reference/professional-inventory.md. The toolbox may only use these. */
export const PROFESSIONAL_STACK = [
  "Python", "TypeScript", "Dart", "Kotlin", "C / C++",
  "Flutter", "Next.js", "ONNX Runtime", "REST APIs",
  "On-device ML", "Vector retrieval", "Geospatial", "Compilers",
  "Git", "SAP Activate", "Agile / Scrum", "Claude Code",
] as const;

const text = z.string().trim().min(1);
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

export const photoSchema = z.object({
  // Photos live in public/ until the content-model spec decides hosting. data: is for fixtures only.
  src: z.string().refine((s) => s.startsWith("/") || s.startsWith("data:image/"), "photo src must be a path under public/, e.g. /photos/x.jpg"),
  alt: z.string().trim().min(1, "every photo needs alt text"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const eventSchema = z.object({
  slug,
  name: text,
  date,
  place: text.optional(),
  summary: text,
  story: z.array(text).default([]),
  photos: z.array(photoSchema).min(1, "an event needs at least one photo"),
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
  music: z.array(z.object({ title: text, note: text.optional(), link: link.optional() })).max(5, "the setlist has five numerals (壱 to 伍); keep it to five songs"),
  hobbies: z.array(z.object({ name: text, note: text, photo: photoSchema.optional(), link: link.optional() })),
  shelf: z.array(z.object({ title: text, kind: z.enum(["manga", "game", "anime"]), note: text })),
  people: z.array(z.object({ name: text, relation: text, note: text.optional(), link: link.optional() })),
});

export type SiteContent = z.output<typeof contentSchema>;
export type Photo = z.output<typeof photoSchema>;
export type EventItem = z.output<typeof eventSchema>;
export type About = SiteContent["about"];
export type Track = SiteContent["music"][number];
export type Hobby = SiteContent["hobbies"][number];
export type ShelfItem = SiteContent["shelf"][number];
export type Person = SiteContent["people"][number];
