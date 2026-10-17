import { act, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { setMedia } from "@/tests/media";
import { MotionProvider, useMotionTier } from "./MotionProvider";
import { NARROW_QUERY, REDUCE_QUERY } from "./tier";

function Show() {
  return <p>{useMotionTier()}</p>;
}

test("tier follows media queries live, without remounting", () => {
  render(<MotionProvider><Show /></MotionProvider>);
  expect(screen.getByText("full")).toBeInTheDocument();
  expect(document.documentElement.dataset.tier).toBe("full");

  act(() => setMedia(REDUCE_QUERY, true));
  expect(screen.getByText("none")).toBeInTheDocument();
  expect(document.documentElement.dataset.tier).toBe("none");

  act(() => setMedia(REDUCE_QUERY, false));
  act(() => setMedia(NARROW_QUERY, true));
  expect(screen.getByText("lite")).toBeInTheDocument();
});
