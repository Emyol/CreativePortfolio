export type StrokeTiming = { delay: number; duration: number };

/** speed is KanjiVG units (0-109 box) per second. */
export function strokeSchedule(lengths: number[], { speed = 260, minMs = 140, gapMs = 70 } = {}): StrokeTiming[] {
  let t = 0;
  return lengths.map((len) => {
    const duration = Math.max(minMs, (len / speed) * 1000);
    const timing = { delay: t, duration };
    t += duration + gapMs;
    return timing;
  });
}

export function scheduleEnd(s: StrokeTiming[]): number {
  const last = s.at(-1);
  return last ? last.delay + last.duration : 0;
}
