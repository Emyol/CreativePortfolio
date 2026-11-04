import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { SkipLinks } from "./SkipLinks";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

const hrefs = () => screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]);

beforeEach(() => {
  nav.pathname = "/";
});

test("on the public desk: the J-card, then the plain track list", () => {
  nav.pathname = "/events";
  render(<SkipLinks base="" />);
  expect(hrefs()).toEqual([
    ["Skip to content", "#jcard"],
    ["Skip to the track list", "/tracklist"],
  ]);
});

test("in the preview, never a public path: the J-card, then the flap's track list once a tape is in", () => {
  nav.pathname = "/admin/preview";
  const { rerender } = render(<SkipLinks base="/admin/preview" />);
  expect(hrefs()).toEqual([["Skip to content", "#jcard"]]);
  nav.pathname = "/admin/preview/people";
  rerender(<SkipLinks base="/admin/preview" />);
  expect(hrefs()).toEqual([
    ["Skip to content", "#jcard"],
    ["Skip to the track list", "#flap"],
  ]);
});
