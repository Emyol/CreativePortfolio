type Listener = (e: MediaQueryListEvent) => void;
const state = new Map<string, boolean>();
const listeners = new Map<string, Set<Listener>>();

export function setMedia(query: string, matches: boolean): void {
  state.set(query, matches);
  for (const l of listeners.get(query) ?? []) l({ matches, media: query } as MediaQueryListEvent);
}

export function resetMedia(): void {
  state.clear();
  listeners.clear();
}

export function installMatchMedia(): void {
  window.matchMedia = (query: string): MediaQueryList => {
    const set = listeners.get(query) ?? new Set<Listener>();
    listeners.set(query, set);
    return {
      get matches() {
        return state.get(query) ?? false;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, l: Listener) => set.add(l),
      removeEventListener: (_: string, l: Listener) => set.delete(l),
      addListener: (l: Listener) => set.add(l),
      removeListener: (l: Listener) => set.delete(l),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList;
  };
}
