import { expect, test } from "vitest";
import { rectFromCorners } from "./project";

test("four projected corners make the box that holds them", () => {
  expect(rectFromCorners([{ x: 10, y: 20 }, { x: 110, y: 22 }, { x: 108, y: 80 }, { x: 12, y: 78 }])).toEqual({ left: 10, top: 20, width: 100, height: 60 });
});

test("corners in any order give the same box", () => {
  expect(rectFromCorners([{ x: 108, y: 80 }, { x: 10, y: 20 }, { x: 12, y: 78 }, { x: 110, y: 22 }])).toEqual({ left: 10, top: 20, width: 100, height: 60 });
});
