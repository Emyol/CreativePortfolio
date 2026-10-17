import type { SiteContent } from "./content/schema";
import type { SeasonId } from "./seasons";

export type ChapterId = "about" | "events" | "music" | "hobbies" | "shelf" | "people";
export type Chapter = { id: ChapterId; kanji: string; label: string; season: SeasonId; seal: string };

export const CHAPTERS: readonly Chapter[] = [
  { id: "about", kanji: "私", label: "About", season: "spring", seal: "春" },
  { id: "events", kanji: "祭", label: "Events", season: "summer-night", seal: "夏" },
  { id: "music", kanji: "音", label: "Music", season: "autumn", seal: "秋" },
  { id: "hobbies", kanji: "趣", label: "Hobbies", season: "late-autumn", seal: "霜" },
  { id: "shelf", kanji: "棚", label: "Shelf", season: "winter", seal: "冬" },
  { id: "people", kanji: "縁", label: "People", season: "plum", seal: "梅" },
];

export function hasContent(id: ChapterId, c: SiteContent): boolean {
  return id === "about" ? c.about.letter.length > 0 : c[id].length > 0;
}

/** Empty chapters never render: no placeholder, no rail seal, no key. */
export function visibleChapters(c: SiteContent): Chapter[] {
  return CHAPTERS.filter((ch) => hasContent(ch.id, c));
}

/** Keys 1-6 follow the rail as the visitor sees it. */
export function chapterForKey(key: string, visible: Chapter[]): Chapter | undefined {
  if (!/^[1-6]$/.test(key)) return undefined;
  return visible[Number(key) - 1];
}

type KeyLike = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "target">;

export function shouldHandleChapterKey(e: KeyLike): boolean {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
  const t = e.target;
  if (!(t instanceof HTMLElement)) return true;
  if (t.isContentEditable || t.closest('[contenteditable]:not([contenteditable="false"])')) return false;
  return !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}
