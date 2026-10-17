import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { About } from "./About";

const renderAbout = (about = FIXTURES.about) =>
  render(<MotionTierContext.Provider value="none"><About about={about} /></MotionTierContext.Provider>);

test("renders every letter paragraph, signed", () => {
  renderAbout();
  for (const p of FIXTURES.about.letter) expect(screen.getByText(p)).toBeInTheDocument();
  expect(screen.getByRole("article", { name: "A letter from Miel" })).toBeInTheDocument();
});

test("the candid photo carries its alt text", () => {
  renderAbout();
  expect(screen.getByAltText(FIXTURES.about.candid!.alt)).toBeInTheDocument();
});

test("the toolbox is a labelled list of readable stamps", () => {
  renderAbout();
  const list = screen.getByRole("list", { name: "Toolbox" });
  expect(list.querySelectorAll("li")).toHaveLength(FIXTURES.about.toolbox.length);
  expect(screen.getByText("TypeScript")).not.toHaveAttribute("aria-hidden");
});

test("no candid and no toolbox render nothing for them", () => {
  renderAbout({ letter: ["Only a letter."], toolbox: [] });
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryByRole("list", { name: "Toolbox" })).toBeNull();
});

test("reduced motion leaves the lines unclipped", () => {
  const { container } = renderAbout();
  for (const line of container.querySelectorAll<HTMLElement>("[data-letter-line]")) expect(line.style.clipPath).toBe("");
});
