import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { previewable, previewContent } from "./preview";
import { TapePage } from "./TapePage";

test("the whole tape renders from content: six tracks and the flip", () => {
  const { container } = render(
    <MotionTierContext.Provider value="none">
      <TapePage content={FIXTURES} />
    </MotionTierContext.Provider>,
  );
  expect(container.querySelectorAll("section[data-track]")).toHaveLength(6);
  expect(container.querySelector("#flip")).not.toBeNull();
});

test("event cards can point at the preview's event pages", () => {
  const { container } = render(
    <MotionTierContext.Provider value="none">
      <TapePage content={FIXTURES} eventHref={(slug) => `/admin/preview/events/${slug}`} />
    </MotionTierContext.Provider>,
  );
  expect(container.querySelector('#events a[href^="/admin/preview/events/"]')).not.toBeNull();
  expect(container.querySelector('#events a[href^="/events/"]')).toBeNull();
});

test("the preview hides archived entries and loads uploaded photos as drafts", () => {
  const photo = { src: "/api/media/0b0e5c3c-1f2a-4b3c-9d8e-123456789abc.webp", alt: "a", width: 2, height: 1 };
  const c = previewContent({ ...FIXTURES, events: [{ ...FIXTURES.events[0], photos: [photo] }, { ...FIXTURES.events[1], archived: true }] });
  expect(c.events).toHaveLength(1);
  expect(c.events[0].photos[0].src).toBe(`${photo.src}?draft`);
  expect(c.about.candid?.src).toBe(FIXTURES.about.candid?.src);
});

test("an unfinished draft previews what is complete and leaves the rest out", () => {
  const unfinished = { ...FIXTURES, events: [{ slug: "", name: "Half written", date: "", summary: "", story: [], photos: [] }, ...FIXTURES.events], about: { letter: [""], toolbox: [] } };
  const c = previewable(unfinished);
  expect(c.events).toHaveLength(FIXTURES.events.length);
  expect(c.about.letter).toEqual([]);
  const { container } = render(
    <MotionTierContext.Provider value="none">
      <TapePage content={c} />
    </MotionTierContext.Provider>,
  );
  expect(container.querySelector("#events")).not.toBeNull();
});
