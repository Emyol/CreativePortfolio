/** Module memory on purpose: a reload is a new visit, so nothing is stored. */
let inserted = false;

export function isFirstInsert(): boolean {
  return !inserted;
}

export function markInserted(): void {
  inserted = true;
}

export function __resetVisitForTests(): void {
  inserted = false;
}
