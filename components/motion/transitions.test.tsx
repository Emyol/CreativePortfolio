import { act, render } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { expect, test } from "vitest";
import { MotionTierContext } from "@/lib/motion/MotionProvider";
import type { MotionTier } from "@/lib/motion/tier";
import { BrushDivider } from "./BrushDivider";
import { InkBleed } from "./InkBleed";
import { SealStamp } from "./SealStamp";

let setTier: (t: MotionTier) => void = () => {};
function Harness({ children }: { children: ReactNode }) {
  const [tier, set] = useState<MotionTier>("full");
  setTier = set;
  return <MotionTierContext.Provider value={tier}>{children}</MotionTierContext.Provider>;
}

test("InkBleed starts hidden in full motion and reverts to fully shown on reduced motion", () => {
  const { container } = render(<Harness><InkBleed>print</InkBleed></Harness>);
  const el = container.querySelector<HTMLElement>("[data-ink-bleed]")!;
  expect(el.style.getPropertyValue("--r")).toBe("0%");
  act(() => setTier("none"));
  expect(el.style.getPropertyValue("--r")).toBe("");
});

test("InkBleed does nothing under reduced motion", () => {
  const { container } = render(<MotionTierContext.Provider value="none"><InkBleed>print</InkBleed></MotionTierContext.Provider>);
  expect(container.querySelector<HTMLElement>("[data-ink-bleed]")!.style.getPropertyValue("--r")).toBe("");
});

test("decorative seals are hidden from assistive tech and marked Japanese", () => {
  const { container } = render(<MotionTierContext.Provider value="none"><SealStamp decorative lang="ja">春</SealStamp></MotionTierContext.Provider>);
  const seal = container.firstElementChild!;
  expect(seal).toHaveAttribute("aria-hidden", "true");
  expect(seal).toHaveAttribute("lang", "ja");
});

test("content seals (toolbox) stay readable", () => {
  const { getByText } = render(<MotionTierContext.Provider value="none"><SealStamp size="sm">TypeScript</SealStamp></MotionTierContext.Provider>);
  expect(getByText("TypeScript")).not.toHaveAttribute("aria-hidden");
});

test("BrushDivider is decorative and blends the two season papers", () => {
  const { container } = render(<MotionTierContext.Provider value="none"><BrushDivider from="spring" to="summer-night" seal="夏" /></MotionTierContext.Provider>);
  const div = container.firstElementChild as HTMLElement;
  expect(div).toHaveAttribute("aria-hidden", "true");
  expect(div.style.getPropertyValue("--from")).toBe("#f3e7e1");
  expect(div.style.getPropertyValue("--to")).toBe("#18203a");
});
