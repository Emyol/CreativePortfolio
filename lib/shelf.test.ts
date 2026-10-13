import { describe, expect, test } from "vitest";
import { dialogueReducer, splitPages, type DialogueState } from "./shelf";

describe("splitPages", () => {
  test("splits on blank lines and trims", () => {
    expect(splitPages("One.\n\n  Two.  \n\n\nThree.")).toEqual(["One.", "Two.", "Three."]);
  });
  test("a single paragraph is one page", () => {
    expect(splitPages("Only.")).toEqual(["Only."]);
  });
  test("single newlines stay inside a page", () => {
    expect(splitPages("Line a\nline b")).toEqual(["Line a\nline b"]);
  });
});

describe("dialogueReducer", () => {
  const closed: DialogueState = { open: false };
  const open = (o: Partial<Extract<DialogueState, { open: true }>> = {}): DialogueState => ({ open: true, item: 0, page: 0, typed: false, ...o });

  test("select opens an item at its first page, untyped", () => {
    expect(dialogueReducer(closed, { type: "select", item: 2 })).toEqual(open({ item: 2 }));
  });
  test("selecting the open item again closes it (put the spine back)", () => {
    expect(dialogueReducer(open({ item: 2 }), { type: "select", item: 2 })).toEqual(closed);
  });
  test("selecting another item switches to it", () => {
    expect(dialogueReducer(open({ item: 0, page: 1, typed: true }), { type: "select", item: 1 })).toEqual(open({ item: 1 }));
  });
  test("advance while typing completes the page first", () => {
    expect(dialogueReducer(open(), { type: "advance", pages: 3 })).toEqual(open({ typed: true }));
  });
  test("advance on a typed page goes to the next page", () => {
    expect(dialogueReducer(open({ typed: true }), { type: "advance", pages: 3 })).toEqual(open({ page: 1 }));
  });
  test("advance on the last typed page closes", () => {
    expect(dialogueReducer(open({ page: 2, typed: true }), { type: "advance", pages: 3 })).toEqual(closed);
  });
  test("typed and advance do nothing while closed", () => {
    expect(dialogueReducer(closed, { type: "typed" })).toBe(closed);
    expect(dialogueReducer(closed, { type: "advance", pages: 2 })).toBe(closed);
  });
});
