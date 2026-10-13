import { cx } from "@/lib/cx";
import { mountainPath } from "@/lib/motion/mountains";

const LAYERS = [
  { seed: 7, peaks: 5, opacity: 0.16, offset: 0 },
  { seed: 19, peaks: 7, opacity: 0.3, offset: 40 },
  { seed: 41, peaks: 9, opacity: 0.55, offset: 90 },
];

export function InkMountains({ className }: { className?: string }) {
  return (
    <div className={cx("ink-mask", className)} data-hero-mountains aria-hidden="true">
      <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" width="100%" height="100%">
        {LAYERS.map((l) => (
          <path key={l.seed} d={mountainPath(l.seed, 1200, 400 - l.offset, l.peaks)} transform={`translate(0 ${l.offset})`} fill="var(--ink)" opacity={l.opacity} />
        ))}
      </svg>
    </div>
  );
}
