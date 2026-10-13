import { describe, expect, test } from "vitest";
import { CHAPTERS, chapterForKey, shouldHandleChapterKey, visibleChapters } from "./chapters";
import { FIXTURES } from "./content/fixtures";
import type { SiteContent } from "./content/schema";

const empty: SiteContent = { about: { letter: [], toolbox: [] }, events: [], music: [], hobbies: [], shelf: [], people: [] };

describe("chapters", () => {
  test("six chapters in spec order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["about", "events", "music", "hobbies", "shelf", "people"]);
    expect(CHAPTERS.map((c) => c.kanji).join("")).toBe("私祭音趣棚縁");
  });
  test("an empty site shows no chapters", () => {
    expect(visibleChapters(empty)).toEqual([]);
  });
  test("about needs a letter, not just a toolbox", () => {
    expect(visibleChapters({ ...empty, about: { letter: [], toolbox: ["Git"] } })).toEqual([]);
  });
  test("only chapters with content are visible, order kept", () => {
    const c = { ...empty, music: [{ title: "x" }], people: [{ name: "a", relation: "b" }] };
    expect(visibleChapters(c).map((ch) => ch.id)).toEqual(["music", "people"]);
  });
  test("fixtures show all six", () => {
    expect(visibleChapters(FIXTURES)).toHaveLength(6);
  });
  test("keys map to rail position, not chapter number", () => {
    const visible = visibleChapters({ ...empty, music: [{ title: "x" }], people: [{ name: "a", relation: "b" }] });
    expect(chapterForKey("1", visible)?.id).toBe("music");
    expect(chapterForKey("2", visible)?.id).toBe("people");
    expect(chapterForKey("3", visible)).toBeUndefined();
    expect(chapterForKey("0", visible)).toBeUndefined();
    expect(chapterForKey("a", visible)).toBeUndefined();
  });
});

describe("shouldHandleChapterKey", () => {
  const base = { key: "1", altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, target: document.body };
  test("plain digit on the page", () => expect(shouldHandleChapterKey(base)).toBe(true));
  test.each(["altKey", "ctrlKey", "metaKey", "shiftKey"] as const)("ignored with %s", (mod) => {
    expect(shouldHandleChapterKey({ ...base, [mod]: true })).toBe(false);
  });
  test.each(["input", "textarea", "select"])("ignored while typing in <%s>", (tag) => {
    expect(shouldHandleChapterKey({ ...base, target: document.createElement(tag) })).toBe(false);
  });
  test("ignored in contenteditable", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", ""); // jsdom doesn't reflect the contentEditable property
    const inner = document.createElement("span");
    div.append(inner);
    document.body.append(div);
    expect(shouldHandleChapterKey({ ...base, target: div })).toBe(false);
    expect(shouldHandleChapterKey({ ...base, target: inner })).toBe(false);
    div.remove();
  });
});
