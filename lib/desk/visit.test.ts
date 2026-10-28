import { beforeEach, describe, expect, it } from "vitest";
import { __resetVisitForTests, isFirstInsert, markInserted } from "./visit";

describe("visit memory", () => {
  beforeEach(() => __resetVisitForTests());

  it("is the first insert until one is marked", () => {
    expect(isFirstInsert()).toBe(true);
    markInserted();
    expect(isFirstInsert()).toBe(false);
  });
});
