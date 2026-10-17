import { readStorage, writeStorage } from "./motion/storage";

const KEY = "side-a:sound";
const listeners = new Set<() => void>();
let enabled: boolean | null = null;
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  if (enabled === null) enabled = typeof window !== "undefined" && readStorage("local", KEY) === "on";
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  writeStorage("local", KEY, on ? "on" : "off");
  listeners.forEach((l) => l());
  if (on) playTap(); // confirm the choice audibly
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A soft wood-block tap: a short triangle blip with a fast decay. */
export function playTap(): void {
  if (!soundEnabled() || typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.08);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.13);
}

export function __resetSoundForTests(): void {
  enabled = null;
  listeners.clear();
}
