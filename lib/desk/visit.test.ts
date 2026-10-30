import { beforeEach, describe, expect, it } from "vitest";
import { __resetVisitForTests, hasLanded, isFirstInsert, markInserted, markLanded } from "./visit";

describe("visit memory", () => {
  beforeEach(() => __resetVisitForTests());

  it("is the first insert until one is marked", () => {
    expect(isFirstInsert()).toBe(true);
    markInserted();
    expect(isFirstInsert()).toBe(false);
  });
});

describe("landing", () => {
  beforeEach(() => __resetVisitForTests());

  it("has not landed until the desk marks it", () => {
    expect(hasLanded()).toBe(false);
    markLanded();
    expect(hasLanded()).toBe(true);
  });
});
