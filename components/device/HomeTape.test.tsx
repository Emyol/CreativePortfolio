import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Underside } from "@/components/frame/Underside";
import { ActiveTrackProvider } from "@/components/motion/ActiveTrack";
import { TapeBody } from "@/components/tracks/TapeBody";
import { parseContent } from "@/lib/content/load";
import seed from "@/lib/content/seed.json";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { visibleTracks } from "@/lib/tape";
import { HomeTape } from "./HomeTape";

// The home page as it ships today: the real seed, which has no tracks yet.
test("launch with today's seed: the device, four blank keys, no tracks, no flip, the links on the back", () => {
  const errors = vi.spyOn(console, "error");
  const content = parseContent(seed, "seed.json");
  const tracks = visibleTracks(content);
  render(
    <MotionTierContext.Provider value="full">
      <ActiveTrackProvider ids={[]}>
        <HomeTape tracks={tracks} songs={[]}>
          <main id="main">
            <TapeBody tracks={tracks} content={content} flip={<div data-flip-slot />} />
          </main>
          <Underside toolbox={content.about.toolbox} links={content.links} />
        </HomeTape>
      </ActiveTrackProvider>
    </MotionTierContext.Provider>,
  );
  expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("Miel");
  expect(document.querySelectorAll("[data-hero] [data-blank-key]")).toHaveLength(4);
  expect(document.querySelectorAll("h2, section[data-track], [data-flip-slot]")).toHaveLength(0);
  expect(document.querySelector("[data-hero] [data-screen]")?.textContent).toBe("SIDE A");
  const dock = document.querySelector<HTMLElement>("[data-dock]")!;
  expect(within(dock).queryAllByRole("link", { hidden: true }).map((a) => a.textContent)).toEqual(["list"]);
  expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/Emyol");
  expect(errors).not.toHaveBeenCalled();
});
