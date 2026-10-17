import { expect, test } from "vitest";
import { formatDate } from "./dates";

test.each([
  ["2025", "2025"],
  ["2025-10", "October 2025"],
  ["2025-10-03", "3 October 2025"],
  ["2024-01-01", "1 January 2024"],
])("formatDate(%s) = %s", (input, out) => {
  expect(formatDate(input)).toBe(out);
});

test("rejects impossible dates", () => {
  expect(() => formatDate("2025-13")).toThrow();
  expect(() => formatDate("2025-02-30")).toThrow();
});
