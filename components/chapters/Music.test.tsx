import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { Music } from "./Music";

const renderMusic = (tracks = FIXTURES.music) => render(<MotionTierContext.Provider value="none"><Music tracks={tracks} /></MotionTierContext.Provider>);

test("an ordered setlist numbered 壱 to 伍, numerals hidden from assistive tech", () => {
  const { container } = renderMusic();
  const items = container.querySelectorAll("ol > li");
  expect(items).toHaveLength(5);
  const numerals = [...container.querySelectorAll("[data-numeral]")];
  expect(numerals.map((n) => n.textContent).join("")).toBe("壱弐参肆伍");
  for (const n of numerals) expect(n).toHaveAttribute("aria-hidden", "true");
});

test("titles link only when a link was supplied", () => {
  renderMusic();
  expect(screen.getByRole("link", { name: "Fixture song 2" })).toHaveAttribute("href", "https://example.com/fixture");
  expect(screen.queryByRole("link", { name: "Fixture song 1" })).toBeNull();
});

test("the record is decorative", () => {
  const { container } = renderMusic();
  expect(container.querySelector("[data-record]")).toHaveAttribute("aria-hidden", "true");
});

test("one track still renders a one-item setlist", () => {
  const { container } = renderMusic([{ title: "Only one" }]);
  expect(container.querySelectorAll("ol > li")).toHaveLength(1);
});
