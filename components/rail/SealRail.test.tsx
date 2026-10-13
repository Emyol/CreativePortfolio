import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { CHAPTERS } from "@/lib/chapters";
import { scrollToId } from "@/lib/motion/navigate";
import { SealRail } from "./SealRail";

vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: { href: string; children: ReactNode }) => <a href={href} {...p}>{children}</a>,
}));
vi.mock("@/lib/motion/navigate", () => ({ scrollToId: vi.fn(() => true) }));
afterEach(() => vi.mocked(scrollToId).mockClear());

const two = [CHAPTERS[2], CHAPTERS[5]]; // music, people

test("one seal per visible chapter, numbered by rail position", () => {
  render(<SealRail chapters={two} />);
  const links = screen.getAllByRole("link", { hidden: true }).filter((a) => a.getAttribute("href")?.startsWith("#"));
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["#music", "#people"]);
  expect(links[0]).toHaveAttribute("aria-keyshortcuts", "1");
});

test("hidden (inert) until the hero leaves", () => {
  const { container } = render(<SealRail chapters={two} />);
  expect(container.querySelector("nav")).toHaveAttribute("inert");
});

test("digit keys jump by rail position", () => {
  render(<SealRail chapters={two} />);
  fireEvent.keyDown(window, { key: "2" });
  expect(scrollToId).toHaveBeenCalledWith("people");
  fireEvent.keyDown(window, { key: "3" });
  expect(scrollToId).toHaveBeenCalledTimes(1);
});

test("modifier digits are left to the browser", () => {
  render(<SealRail chapters={two} />);
  fireEvent.keyDown(window, { key: "1", ctrlKey: true });
  expect(scrollToId).not.toHaveBeenCalled();
});

test("renders nothing for an empty site", () => {
  const { container } = render(<SealRail chapters={[]} />);
  expect(container).toBeEmptyDOMElement();
});
