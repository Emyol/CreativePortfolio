import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { issuesByPath, slugify } from "./issues";

test("a missing alt text is reported on its field", () => {
  const c = { ...FIXTURES, events: [{ ...FIXTURES.events[0], photos: [{ ...FIXTURES.events[0].photos[0], alt: "" }] }] };
  expect(issuesByPath(c).get("events.0.photos.0.alt")).toBe("every photo needs alt text");
});

test("a thirteenth song is reported on the mixtape", () => {
  const c = { ...FIXTURES, music: Array(13).fill(FIXTURES.music[0]) };
  expect(issuesByPath(c).get("music")).toBe("a mixtape holds at most 12 songs");
});

test("valid content has no issues", () => {
  expect(issuesByPath(FIXTURES).size).toBe(0);
});

test("slugs come from names", () => {
  expect(slugify("PyCon PH 2025!")).toBe("pycon-ph-2025");
  expect(slugify("  Música & Mates ")).toBe("musica-mates");
  expect(slugify("")).toBe("");
});
