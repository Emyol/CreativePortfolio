import { describe, expect, it } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { visibleTracks } from "@/lib/tape";
import { TRACK_INK, backLabel, tapeLabel } from "./tapeLabel";

const tracks = visibleTracks(FIXTURES);
const track = (id: string) => {
  const t = tracks.find((x) => x.id === id);
  if (!t) throw new Error(`no fixture track ${id}`);
  return t;
};

describe("tapeLabel", () => {
  it("prints the fixed number, the label and the side", () => {
    expect(tapeLabel(track("mixtape"))).toEqual({ number: "03", title: "mixtape", sub: "SIDE A · SONGS HE LOVES" });
  });

  it("prints side B and a two-word label as they are", () => {
    expect(tapeLabel(track("on-rotation"))).toEqual({ number: "06", title: "on rotation", sub: "SIDE B · MANGA · GAMES · ANIME" });
  });

  it("has a printed line for every track", () => {
    for (const t of tracks) expect(tapeLabel(t).sub).toMatch(/^SIDE [AB] · \S/);
  });
});

describe("backLabel", () => {
  it("counts the events and dates the newest one", () => {
    expect(backLabel("events", FIXTURES)).toEqual(["7 live recordings", "latest June 2025"]);
  });

  it("counts what is on each other track", () => {
    expect(backLabel("mixtape", FIXTURES)).toEqual(["6 songs"]);
    expect(backLabel("people", FIXTURES)).toEqual(["4 on the channels"]);
    expect(backLabel("made", FIXTURES)).toEqual(["3 things"]);
    expect(backLabel("on-rotation", FIXTURES)).toEqual(["3 on the shelf"]);
    expect(backLabel("about", FIXTURES)).toEqual(["a letter"]);
  });

  it("says one, not ones", () => {
    const one = { ...FIXTURES, events: FIXTURES.events.slice(0, 1), music: FIXTURES.music.slice(0, 1), hobbies: FIXTURES.hobbies.slice(0, 1) };
    expect(backLabel("events", one)).toEqual(["1 live recording", "latest 10 January 2024"]);
    expect(backLabel("mixtape", one)).toEqual(["1 song"]);
    expect(backLabel("made", one)).toEqual(["1 thing"]);
  });
});

describe("TRACK_INK", () => {
  it("gives each track its own ink", () => {
    expect(TRACK_INK).toEqual({
      about: [255, 154, 60],
      events: [70, 110, 255],
      mixtape: [255, 60, 142],
      people: [47, 214, 163],
      made: [214, 160, 70],
      "on-rotation": [150, 100, 255],
    });
  });
});
