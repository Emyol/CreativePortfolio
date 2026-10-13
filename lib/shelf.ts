export function splitPages(note: string): string[] {
  return note.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

export type DialogueState = { open: false } | { open: true; item: number; page: number; typed: boolean };
export type DialogueAction = { type: "select"; item: number } | { type: "advance"; pages: number } | { type: "typed" } | { type: "close" };

const CLOSED: DialogueState = { open: false };

export function dialogueReducer(s: DialogueState, a: DialogueAction): DialogueState {
  switch (a.type) {
    case "select":
      return s.open && s.item === a.item ? CLOSED : { open: true, item: a.item, page: 0, typed: false };
    case "typed":
      return s.open ? { ...s, typed: true } : s;
    case "advance":
      if (!s.open) return s;
      if (!s.typed) return { ...s, typed: true };
      return s.page < a.pages - 1 ? { ...s, page: s.page + 1, typed: false } : CLOSED;
    case "close":
      return CLOSED;
  }
}
