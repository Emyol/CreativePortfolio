// The mixtape deck's playback, as a tiny external store. The Spotify deck writes it; the
// reels, the device screen and the dock read it without re-rendering on every frame.
export type Playback = { status: "idle" | "loading" | "playing" | "paused" | "error"; song: number | null; position: number; duration: number };

const IDLE: Playback = { status: "idle", song: null, position: 0, duration: 0 };

let state: Playback = IDLE;
const listeners = new Set<() => void>();

export function getPlayback(): Playback {
  return state;
}

export const getServerPlayback = (): Playback => IDLE;

export function subscribePlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPlayback(next: Partial<Playback>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function resetPlayback(): void {
  setPlayback(IDLE);
}

export const isPlaying = (p: Playback): boolean => p.status === "playing";
