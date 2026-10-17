// Playback state of the mixtape deck. Stub until the Spotify deck lands: always idle.
export type Playback = { status: "idle" | "loading" | "playing" | "paused" | "error"; song: number | null; position: number; duration: number };

const IDLE: Playback = { status: "idle", song: null, position: 0, duration: 0 };

export function getPlayback(): Playback {
  return IDLE;
}

export function subscribePlayback(_listener: () => void): () => void {
  return () => {};
}

export const isPlaying = (p: Playback): boolean => p.status === "playing";
