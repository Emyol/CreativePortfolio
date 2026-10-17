import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { CHAPTERS } from "@/lib/chapters";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { SEASONS } from "@/lib/seasons";
import { SeasonController } from "./SeasonController";

vi.mock("./ActiveChapter", () => ({ useActiveChapter: () => "events" }));

test("reduced motion sets the wall tint at once and blows no weather", () => {
  const { container } = render(
    <MotionTierContext.Provider value="none">
      <SeasonController chapters={[...CHAPTERS]} />
    </MotionTierContext.Provider>,
  );
  expect(document.documentElement.style.getPropertyValue("--wall")).toBe(SEASONS["summer-night"].wall);
  expect(container.querySelector("canvas")).toBeNull();
});
