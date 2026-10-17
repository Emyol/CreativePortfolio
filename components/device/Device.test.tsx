import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test } from "vitest";
import { FIXTURES } from "@/lib/content/fixtures";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import { visibleTracks } from "@/lib/tape";
import { Device } from "./Device";
import { Screen } from "./Screen";

const t = visibleTracks(FIXTURES);
const still = (ui: ReactNode) => render(<MotionTierContext.Provider value="none">{ui}</MotionTierContext.Provider>);

test("the h1 is Miel and the art is decorative", () => {
  still(<Device tracks={t} side="a" current={null} interactive />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("Miel");
  const imgs = document.querySelectorAll("img");
  expect(imgs.length).toBeGreaterThan(0);
  for (const img of imgs) expect(img).toHaveAttribute("alt", "");
});

test("side a keys link to its four tracks with printed labels", () => {
  still(<Device tracks={t} side="a" current="events" interactive />);
  const nav = screen.getByRole("navigation", { name: "Tape" });
  expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#about", "#events", "#mixtape", "#people"]);
  expect(within(nav).getByRole("link", { name: "events" })).toHaveAttribute("aria-current", "true");
  expect(within(nav).getByRole("link", { name: "about" })).not.toHaveAttribute("aria-current");
});

test("side b relabels the keys and blanks the unused ones", () => {
  still(<Device tracks={t} side="b" current="made" interactive />);
  const nav = screen.getByRole("navigation", { name: "Tape" });
  expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["made", "on rotation"]);
  expect(document.querySelectorAll("[data-blank-key]")).toHaveLength(2);
});

test("empty tape: four blank keys, nothing focusable", () => {
  still(<Device tracks={[]} side="a" current={null} interactive />);
  expect(document.querySelectorAll("[data-blank-key]")).toHaveLength(4);
  for (const k of document.querySelectorAll("[data-blank-key]")) expect(k).toHaveAttribute("aria-hidden", "true");
  expect(screen.queryAllByRole("link")).toHaveLength(0);
});

test("a non-interactive device is inert", () => {
  still(<Device tracks={t} side="a" current={null} interactive={false} />);
  expect(screen.getByRole("navigation", { hidden: true }).closest("[inert]")).not.toBeNull();
});

test("the knob points at the current track", () => {
  still(<Device tracks={t} side="a" current="people" interactive />);
  expect(document.querySelector<HTMLElement>("[data-knob]")!.style.rotate).toBe("135deg");
});

test("the knob has one detent per track on the side, the current one lit", () => {
  still(<Device tracks={t} side="a" current="events" interactive />);
  const detents = document.querySelectorAll("[data-detent]");
  expect(detents).toHaveLength(4);
  expect([...detents].map((d) => d.hasAttribute("data-lit"))).toEqual([false, true, false, false]);
});

test("the screen reads SIDE A and the first track on arrival, or just SIDE A on an empty tape", () => {
  still(<Device tracks={t} side="a" current={null} interactive />);
  expect(document.querySelector("[data-screen]")).toHaveTextContent("SIDE A01 about");
  document.body.innerHTML = "";
  still(<Device tracks={[]} side="a" current={null} interactive />);
  expect(document.querySelector("[data-screen]")!.textContent).toBe("SIDE A");
});

test("an unbroken title truncates on screen but keeps the full text", () => {
  still(<Screen lines={["FixtureSongWithAnUnbrokenTitleThatMustTruncate"]} />);
  expect(screen.getByTitle("FixtureSongWithAnUnbrokenTitleThatMustTruncate")).toBeInTheDocument();
});
