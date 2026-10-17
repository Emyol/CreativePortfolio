import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { Events } from "./Events";

vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: { href: string; children: ReactNode }) => <a href={href} {...p}>{children}</a>,
}));

const renderEvents = () => render(<MotionTierContext.Provider value="none"><Events events={FIXTURES.events} /></MotionTierContext.Provider>);

test("one link per event, to its own page, named by its heading", () => {
  renderEvents();
  const links = screen.getAllByRole("link");
  expect(links.map((l) => l.getAttribute("href"))).toEqual(FIXTURES.events.map((e) => `/events/${e.slug}`));
  expect(within(links[0]).getByRole("heading", { level: 3 })).toHaveTextContent("Fixture event 1");
});

test("dates are machine-readable and human-formatted", () => {
  const { container } = renderEvents();
  const time = container.querySelector("time")!;
  expect(time).toHaveAttribute("dateTime", FIXTURES.events[0].date);
  expect(time).toHaveTextContent("10 January 2024");
});

test("tile shapes cycle through the six-slot pattern", () => {
  const { container } = renderEvents();
  const shapes = [...container.querySelectorAll("[data-shape]")].map((el) => el.getAttribute("data-shape"));
  expect(shapes).toEqual(["a", "b", "c", "d", "e", "f", "a"]);
});

test("an event without a place shows only its date", () => {
  renderEvents();
  const noPlace = FIXTURES.events.find((e) => !e.place)!;
  const link = screen.getAllByRole("link").find((l) => l.getAttribute("href") === `/events/${noPlace.slug}`)!;
  expect(link.textContent).not.toContain("·");
});
