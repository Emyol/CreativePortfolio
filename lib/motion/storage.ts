type Kind = "local" | "session";

function store(kind: Kind): Storage {
  return kind === "local" ? window.localStorage : window.sessionStorage;
}

// Storage throws in private windows and when site data is blocked. Every caller has a
// sensible default, so a failure means "no saved preference", not an error.
export function readStorage(kind: Kind, key: string): string | null {
  try {
    return store(kind).getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(kind: Kind, key: string, value: string): void {
  try {
    store(kind).setItem(key, value);
  } catch {
    // See readStorage: the preference just isn't remembered.
  }
}
