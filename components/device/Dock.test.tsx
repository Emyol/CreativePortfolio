import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { visibleTracks } from "@/lib/tape";
import { Dock } from "./Dock";

const t = visibleTracks(FIXTURES);
const still = (ui: ReactNode) => render(<MotionTierContext.Provider value="none">{ui}</MotionTierContext.Provider>);

test("the dock offers the track list even on an empty tape", () => {
  still(<Dock tracks={[]} side="a" current={null} visible />);
  expect(screen.getByRole("link", { name: "list" })).toHaveAttribute("href", "/tracklist");
  expect(document.querySelectorAll("[data-blank-key]")).toHaveLength(4);
});

test("a hidden dock is inert, so it can't take focus while the hero keys are live", () => {
  still(<Dock tracks={t} side="a" current={null} visible={false} />);
  expect(document.querySelector("[data-dock]")).toHaveAttribute("inert");
});

test("a visible dock's keys navigate", () => {
  still(<Dock tracks={t} side="a" current="mixtape" visible />);
  const nav = screen.getByRole("navigation", { name: "Tape" });
  expect(within(nav).getByRole("link", { name: "mixtape" })).toHaveAttribute("aria-current", "true");
  expect(document.querySelector("[data-dock]")).not.toHaveAttribute("inert");
});

test("the screen shows the side and the current track", () => {
  still(<Dock tracks={t} side="b" current="on-rotation" visible />);
  expect(document.querySelector("[data-dock] [data-screen]")).toHaveTextContent("SIDE B06 on rotation");
});

test("sound and track-key switches sit beside the screen", () => {
  still(<Dock tracks={t} side="a" current={null} visible />);
  expect(screen.getByRole("button", { name: "Sound" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Track keys" })).toBeInTheDocument();
});
