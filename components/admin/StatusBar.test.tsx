import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { StatusBar, type PublishState } from "./StatusBar";

const props = { issues: 0, publish: { kind: "idle" } as PublishState, onShowIssue() {}, onPublish() {}, onConfirm() {}, onCancel() {} };

test("routine saving is shown but not announced", () => {
  render(<StatusBar {...props} status="saving" />);
  expect(screen.getByText("Saving")).toBeInTheDocument();
  for (const region of screen.queryAllByRole("status")) expect(region).not.toHaveTextContent("Saving");
});

test("going offline is announced politely, a failed save as an alert", () => {
  const { rerender } = render(<StatusBar {...props} status="offline" />);
  expect(screen.getAllByRole("status").some((r) => r.textContent === "Offline, will retry")).toBe(true);
  rerender(<StatusBar {...props} status="error" message="Too big." />);
  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save. Too big.");
});
