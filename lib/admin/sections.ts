import type { SiteContent } from "@/lib/content/schema";

export type FieldKind =
  | "text" | "longtext" | "paragraphs" | "select" | "date" | "slug"
  | "spotify" | "photo" | "photos" | "toolbox" | "url" | "dots";

export type FieldSpec = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  hint?: string;
  optional?: boolean;
};

type Item = Record<string, unknown>;

export type SectionSpec = {
  id: keyof SiteContent;
  /** As printed on the tape. */
  title: string;
  hint?: string;
  list: boolean;
  /** New entries go first (newest first on the tape) or last. */
  addAt?: "start" | "end";
  addLabel?: string;
  itemLabel?: (item: Item) => string;
  fields: FieldSpec[];
  blank?: () => Item;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * The editor, section by section, in tape order. Field keys are checked against
 * contentSchema by sections.test.ts, so a schema change can't silently drop a field.
 */
export const SECTIONS: SectionSpec[] = [
  {
    id: "about",
    title: "about",
    hint: "The liner notes: a few paragraphs about you, and one candid photo if you like.",
    list: false,
    fields: [
      { key: "letter", label: "Liner notes", kind: "paragraphs", hint: "Leave a blank line between paragraphs." },
      { key: "candid", label: "Candid photo", kind: "photo", optional: true },
      { key: "dots", label: "Dot screen", kind: "dots", optional: true, hint: "The tape draws your candid as dots. Adjust how fine they are and how it's lit; the preview here is what the tape shows." },
      { key: "toolbox", label: "Toolbox", kind: "toolbox", hint: "Printed on the spec sticker on the back of the device." },
    ],
  },
  {
    id: "events",
    title: "events",
    hint: "Events you went to.",
    list: true,
    addAt: "start",
    addLabel: "Add an event",
    itemLabel: (e) => str(e.name) || "New event",
    blank: () => ({ slug: "", name: "", date: "", summary: "", story: [], photos: [] }),
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "slug", label: "Address", kind: "slug", hint: "The event's page: /events/your-address. Filled in from the name." },
      { key: "date", label: "Date", kind: "date", hint: "A year, a month or a day." },
      { key: "place", label: "Place", kind: "text", optional: true },
      { key: "summary", label: "Summary", kind: "longtext", hint: "One or two lines for the card." },
      { key: "story", label: "Story", kind: "paragraphs", hint: "Leave a blank line between paragraphs." },
      { key: "photos", label: "Photos", kind: "photos", hint: "The first one is the cover." },
    ],
  },
  {
    id: "music",
    title: "mixtape",
    hint: "Songs you love, by their real artists. Up to 12.",
    list: true,
    addAt: "end",
    addLabel: "Add a song",
    itemLabel: (s) => [str(s.title), str(s.artist)].filter(Boolean).join(" · ") || "New song",
    blank: () => ({ title: "", artist: "", spotify: "" }),
    fields: [
      { key: "spotify", label: "Spotify link", kind: "spotify", hint: "Share > Copy song link, then paste it here." },
      { key: "title", label: "Title", kind: "text" },
      { key: "artist", label: "Artist", kind: "text" },
      { key: "note", label: "Your note", kind: "longtext", optional: true },
    ],
  },
  {
    id: "people",
    title: "people",
    hint: "The people around you, credited like an album's thank-you list.",
    list: true,
    addAt: "end",
    addLabel: "Add a person",
    itemLabel: (p) => str(p.name) || "New person",
    blank: () => ({ name: "", relation: "" }),
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "relation", label: "Who they are to you", kind: "text" },
      { key: "note", label: "Note", kind: "longtext", optional: true },
      { key: "link", label: "Link", kind: "url", optional: true },
    ],
  },
  {
    id: "hobbies",
    title: "made",
    hint: "Things you do and make. A photo makes it bigger on the tape.",
    list: true,
    addAt: "end",
    addLabel: "Add something you made",
    itemLabel: (h) => str(h.name) || "New thing",
    blank: () => ({ name: "", note: "" }),
    fields: [
      { key: "name", label: "Name", kind: "text" },
      { key: "note", label: "Note", kind: "longtext" },
      { key: "photo", label: "Photo", kind: "photo", optional: true },
      { key: "link", label: "Link", kind: "url", optional: true },
    ],
  },
  {
    id: "shelf",
    title: "on rotation",
    hint: "Games, anime and manga you're into right now.",
    list: true,
    addAt: "end",
    addLabel: "Add to the shelf",
    itemLabel: (s) => str(s.title) || "New entry",
    blank: () => ({ title: "", kind: "game", note: "" }),
    fields: [
      { key: "title", label: "Title", kind: "text" },
      { key: "kind", label: "Kind", kind: "select", options: ["manga", "game", "anime"] },
      { key: "note", label: "Note", kind: "longtext", hint: "Leave a blank line between paragraphs." },
    ],
  },
  {
    id: "links",
    title: "links",
    hint: "Printed on the battery door on the back of the device. Up to 4, https only.",
    list: true,
    addAt: "end",
    addLabel: "Add a link",
    itemLabel: (l) => str(l.label) || "New link",
    blank: () => ({ label: "", url: "" }),
    fields: [
      { key: "label", label: "Label", kind: "text" },
      { key: "url", label: "Address", kind: "url" },
    ],
  },
];
