import type { CSSProperties } from "react";
import { DEVICE, pct, type Pt } from "@/lib/device/layout";
import { packDiameters, type SideId } from "@/lib/tape";
import { Sprite } from "./Sprite";
import styles from "./Cassette.module.css";

const { plate, reels, pack, cassette: box } = DEVICE;
const px = (size: number) => Math.round(size * plate.width);

/** A square of `size` (fraction of the plate's width) centred on `at` (plate fractions), placed inside the cassette box. */
function inBox(at: Pt, size: number): CSSProperties {
  const w = size / box.w;
  const h = (size * plate.width) / (box.h * plate.height);
  return { left: pct((at.x - box.x) / box.w - w / 2), top: pct((at.y - box.y) / box.h - h / 2), width: pct(w), height: pct(h) };
}

type Props = { side: SideId; className?: string; style?: CSSProperties; eager?: boolean };

/**
 * The tape in the window: two packs, two hubs, then the shell with its label window on top.
 * Reels and packs carry data-reel / data-pack for useReelMotion.
 */
export function Cassette({ side, className, style, eager = true }: Props) {
  const start = packDiameters(0, pack);
  return (
    <div className={[styles.cassette, className].filter(Boolean).join(" ")} style={style} data-cassette>
      <span className={styles.part} style={{ ...inBox(reels.left, pack.max), scale: String(start.left / pack.max) }} data-pack="left">
        <Sprite name="pack" className={styles.fill} width={px(pack.max)} height={px(pack.max)} eager={eager} />
      </span>
      <span className={styles.part} style={{ ...inBox(reels.right, pack.max), scale: String(start.right / pack.max) }} data-pack="right">
        <Sprite name="pack" className={styles.fill} width={px(pack.max)} height={px(pack.max)} eager={eager} />
      </span>
      <span className={styles.part} style={inBox(reels.left, reels.hub)} data-reel="left">
        <Sprite name="hub" className={styles.fill} width={px(reels.hub)} height={px(reels.hub)} eager={eager} />
      </span>
      <span className={styles.part} style={inBox(reels.right, reels.hub)} data-reel="right">
        <Sprite name="hub" className={styles.fill} width={px(reels.hub)} height={px(reels.hub)} eager={eager} />
      </span>
      <Sprite name={side === "a" ? "shell-a" : "shell-b"} className={styles.shell} width={1077} height={714} eager={eager} />
    </div>
  );
}
