import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { PreviewLabel } from "./PreviewLabel";

test("the preview says how many unfinished entries it leaves out", () => {
  const { rerender } = render(<PreviewLabel hidden={2} />);
  expect(screen.getByText("2 unfinished entries aren't shown")).toBeInTheDocument();
  rerender(<PreviewLabel hidden={1} />);
  expect(screen.getByText("1 unfinished entry isn't shown")).toBeInTheDocument();
  rerender(<PreviewLabel hidden={0} />);
  expect(screen.queryByText(/unfinished/)).toBeNull();
});
