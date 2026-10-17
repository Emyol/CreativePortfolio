import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import type { MotionTier } from "@/lib/motion/tier";
import { Flip } from "./Flip";

const at = (tier: MotionTier, ui: ReactNode) => render(<MotionTierContext.Provider value={tier}>{ui}</MotionTierContext.Provider>);

test("the flip is a named region", () => {
  at("none", <Flip />);
  expect(screen.getByRole("region", { name: "Flip to side B" })).toHaveAttribute("id", "flip");
});

test("reduced motion shows the turned tape as one still image, with no canvas", () => {
  at("none", <Flip />);
  expect(document.querySelector("canvas")).toBeNull();
  const imgs = document.querySelectorAll("#flip img");
  expect(imgs).toHaveLength(1);
  expect(imgs[0].getAttribute("src")).toMatch(/flip-23\.webp$/);
  expect(imgs[0]).toHaveAttribute("alt", "");
});

test("phones crossfade the first and last frames instead of scrubbing", () => {
  at("lite", <Flip />);
  expect(document.querySelector("canvas")).toBeNull();
  expect([...document.querySelectorAll("#flip img")].map((i) => i.getAttribute("src")?.match(/flip-\d\d/)?.[0])).toEqual(["flip-00", "flip-23"]);
});

test("full motion scrubs a canvas over a poster frame", () => {
  at("full", <Flip />);
  expect(document.querySelector("#flip canvas")).not.toBeNull();
  expect(document.querySelector("#flip img")?.getAttribute("src")).toMatch(/flip-00\.webp$/);
});
