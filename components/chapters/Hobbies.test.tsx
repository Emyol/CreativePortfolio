import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { Hobbies } from "./Hobbies";

const renderHobbies = () => render(<MotionTierContext.Provider value="none"><Hobbies hobbies={FIXTURES.hobbies} /></MotionTierContext.Provider>);

test("one plaque per hobby, each with a heading", () => {
  renderHobbies();
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(FIXTURES.hobbies.map((h) => h.name));
});

test("links say what they lead to", () => {
  renderHobbies();
  expect(screen.getByRole("link", { name: "More about Fixture hobby two" })).toHaveAttribute("href", "https://example.com/fixture");
});

test("photos carry alt text", () => {
  renderHobbies();
  expect(screen.getByAltText("Fixture photo 30")).toBeInTheDocument();
});

test("reduced motion leaves plaques in place", () => {
  const { container } = renderHobbies();
  for (const el of container.querySelectorAll<HTMLElement>("[data-ema]")) expect(el.style.transform).toBe("");
});
