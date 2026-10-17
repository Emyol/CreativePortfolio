import { readStorage, writeStorage } from "./motion/storage";

const KEY = "side-a:sound";
// Sound effects only, synthesised here. Never music: the mixtape plays through Spotify.
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
  if (on) playKey(); // confirm the choice audibly
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function audio(): AudioContext | null {
  if (!soundEnabled() || typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
  try {
    ctx ??= new window.AudioContext();
  } catch {
    return null; // no audio hardware or too many contexts: sound just stays quiet
  }
  // Browsers refuse to resume without a gesture; the next gesture unlocks it (see below).
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/**
 * A clunk driven by scroll is not a user gesture, so after a reload with sound on it would
 * be dropped. Waking the context on the first tap or key makes later sounds audible.
 */
export function installSoundUnlock(): () => void {
  const wake = () => {
    if (audio()) off();
  };
  const off = () => {
    window.removeEventListener("pointerdown", wake, true);
    window.removeEventListener("keydown", wake, true);
  };
  window.addEventListener("pointerdown", wake, true);
  window.addEventListener("keydown", wake, true);
  return off;
}

function noise(ac: AudioContext, seconds: number): AudioBufferSourceNode {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

/** A tape key going down: a 25 ms burst of band-passed noise around 3 kHz. */
export function playKey(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const src = noise(ac, 0.03);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3000;
  band.Q.value = 1.4;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.32, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  src.connect(band).connect(gain).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.03);
}

/** The cassette dropping back into the deck: a low 90 ms thump with a click on top. */
export function playClunk(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const body = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.09);
  body.gain.setValueAtTime(0.0001, t);
  body.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
  body.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(body).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.1);
  const click = noise(ac, 0.02);
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1800;
  const cg = ac.createGain();
  cg.gain.setValueAtTime(0.2, t);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
  click.connect(hp).connect(cg).connect(ac.destination);
  click.start(t);
  click.stop(t + 0.02);
}

export function __resetSoundForTests(): void {
  enabled = null;
  ctx = null;
  listeners.clear();
}
