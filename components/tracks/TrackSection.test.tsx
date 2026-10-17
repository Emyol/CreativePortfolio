import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { TrackSection } from "./TrackSection";

const track = { id: "events", side: "a", label: "events", number: 2 } as const;

test("the heading is named by its label only; the number is decoration", () => {
  render(<TrackSection track={track}><p>Body</p></TrackSection>);
  const h2 = screen.getByRole("heading", { level: 2 });
  expect(h2).toHaveAccessibleName("events");
  expect(h2).toHaveAttribute("id", "events-title");
  expect(h2).toHaveAttribute("tabindex", "-1");
  const number = screen.getByText("02");
  expect(number).toHaveAttribute("aria-hidden", "true");
});

test("the section is labelled by its heading and carries its track and side", () => {
  render(<TrackSection track={track}><p>Body</p></TrackSection>);
  const section = screen.getByRole("region", { name: "events" });
  expect(section).toHaveAttribute("id", "events");
  expect(section).toHaveAttribute("data-track", "events");
  expect(section).toHaveAttribute("data-side", "a");
  expect(section).toHaveTextContent("Body");
});
