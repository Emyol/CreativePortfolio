import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { People } from "./People";

const renderPeople = (people = FIXTURES.people) => render(<MotionTierContext.Provider value="none"><People people={people} /></MotionTierContext.Provider>);

test("an ordered list of people with headings, relations and a knot each", () => {
  const { container } = renderPeople();
  expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(FIXTURES.people.map((p) => p.name));
  expect(container.querySelectorAll("[data-knot]")).toHaveLength(FIXTURES.people.length);
  expect(screen.getAllByText("Fixture relation")).toHaveLength(FIXTURES.people.length);
});

test("the thread is decorative", () => {
  const { container } = renderPeople();
  expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

test("names link only when a link was supplied", () => {
  renderPeople();
  expect(screen.getByRole("link", { name: "Fixture person B" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Fixture person A" })).toBeNull();
});

test("a single person renders without a thread curve", () => {
  const { container } = renderPeople([{ name: "Solo", relation: "Friend" }]);
  expect(container.querySelector("[data-thread]")?.getAttribute("d") ?? "").not.toContain("C");
});
