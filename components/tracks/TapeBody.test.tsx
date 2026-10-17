import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { visibleTracks } from "@/lib/tape";
import { TapeBody } from "./TapeBody";

const order = () => [...document.querySelectorAll("section[data-track], [data-flip-slot]")].map((el) => el.getAttribute("data-track") ?? "flip");

test("fixtures render six tracks in tape order with the flip between the sides", () => {
  render(<TapeBody tracks={visibleTracks(FIXTURES)} content={FIXTURES} flip={<div data-flip-slot />} />);
  expect(order()).toEqual(["about", "events", "mixtape", "people", "flip", "made", "on-rotation"]);
});

test("without side b there is no flip", () => {
  const c = { ...FIXTURES, hobbies: [], shelf: [] };
  render(<TapeBody tracks={visibleTracks(c)} content={c} flip={<div data-flip-slot />} />);
  expect(order()).toEqual(["about", "events", "mixtape", "people"]);
});

test("an empty tape renders nothing", () => {
  const c = { ...FIXTURES, about: { ...FIXTURES.about, letter: [] }, events: [], music: [], people: [], hobbies: [], shelf: [] };
  const { container } = render(<TapeBody tracks={visibleTracks(c)} content={c} flip={<div data-flip-slot />} />);
  expect(container.querySelectorAll("section, h2, [data-flip-slot]")).toHaveLength(0);
});
