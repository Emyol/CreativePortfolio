/** Module memory on purpose: a reload is a new visit, so nothing is stored. */
let inserted = false;
let landed = false;

export function isFirstInsert(): boolean {
  return !inserted;
}

export function markInserted(): void {
  inserted = true;
}

/**
 * False while the page the visit landed on is still being put on screen (its first render,
 * effects included), true from then on: a section mounting later came by a move within the
 * site, so it may take focus; on the landing page, focus stays where the browser put it.
 */
export function hasLanded(): boolean {
  return landed;
}

/** Called by the desk once its first render has committed (a parent's effects run last). */
export function markLanded(): void {
  landed = true;
}

export function __resetVisitForTests(): void {
  inserted = false;
  landed = false;
}
