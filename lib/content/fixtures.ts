import type { SiteContent } from "./schema";

function swatch(label: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 30% 35%)"/><stop offset="1" stop-color="hsl(${hue + 40} 35% 15%)"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><text x="60" y="740" font-size="64" fill="#fff" font-family="sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const photo = (n: number) => ({ src: swatch(`Fixture photo ${n}`, n * 37), alt: `Fixture photo ${n}`, width: 1200, height: 800 });

/** Development and test data only. getContent() refuses these in production builds. */
export const FIXTURES: SiteContent = {
  about: {
    letter: [
      "Fixture letter, first paragraph. This text stands in for the owner's own letter and never ships.",
      "Fixture letter, second paragraph, long enough to wrap across several ruled lines on a desktop screen so the write-in reveal can be judged properly.",
    ],
    candid: photo(0),
    toolbox: ["TypeScript", "Python", "Next.js", "Git"],
  },
  events: Array.from({ length: 7 }, (_, i) => ({
    slug: `fixture-event-${i + 1}`,
    name: i === 2 ? "Fixture event with an extraordinarily long name that should wrap gracefully" : i === 4 ? "FixtureEventWithAnUnbrokenWordThatMustNotOverflow" : `Fixture event ${i + 1}`,
    date: i % 2 ? `2025-0${i + 1}` : `2024-0${i + 1}-1${i}`,
    place: i === 3 ? undefined : `Fixture place ${i + 1}`,
    summary: `Fixture summary for event ${i + 1}.`,
    story: [`Fixture story paragraph for event ${i + 1}.`, "A second fixture paragraph."],
    photos: [photo(i + 1), photo(i + 11)],
  })),
  music: Array.from({ length: 5 }, (_, i) => ({ title: `Fixture song ${i + 1}`, note: i === 0 ? "Fixture note." : undefined, link: i === 1 ? "https://example.com/fixture" : undefined })),
  hobbies: [
    { name: "Fixture hobby one", note: "Fixture note.", photo: photo(30) },
    { name: "Fixture hobby two", note: "Fixture note that runs a little longer than the first.", link: "https://example.com/fixture" },
    { name: "Fixture hobby three", note: "Fixture note." },
  ],
  shelf: [
    { title: "Fixture manga", kind: "manga", note: "Fixture page one.\n\nFixture page two.\n\nFixture page three." },
    { title: "Fixture game with a long title", kind: "game", note: "Fixture single page." },
    { title: "Fixture anime", kind: "anime", note: "Fixture page one.\n\nFixture page two." },
  ],
  people: [
    { name: "Fixture person A", relation: "Fixture relation", note: "Fixture note." },
    { name: "Fixture person B", relation: "Fixture relation", link: "https://example.com/fixture" },
    { name: "Fixture person C", relation: "Fixture relation" },
    { name: "Fixture person D", relation: "Fixture relation" },
  ],
};
