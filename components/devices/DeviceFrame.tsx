import type { CSSProperties, ReactNode } from "react";
import { pct } from "@/lib/device/layout";
import { deviceLayout, type DeviceId } from "@/lib/devices/layout";
import styles from "./DeviceFrame.module.css";

type Props = { id: DeviceId; label: string; children: ReactNode };

/**
 * A section's device on the J-card: its body, and `children` (its live screen) in the
 * body's screen rect (lib/devices/layout.ts). With the body rendered (`art`), the image is
 * the device and the screen sits in its cut-out. Until then, a CSS stand-in: a slim
 * aluminium bezel round the screen, its margins the layout's, the screen growing with what
 * it holds. Either way the screen is the OLED (the only dark surface on the card).
 */
export function DeviceFrame({ id, label, children }: Props) {
  const { size, art, screen } = deviceLayout(id);
  const aspectRatio = `${size.width} / ${size.height}`;

  if (art) {
    return (
      <div role="group" aria-label={label} data-device={id} className={`${styles.frame} ${styles.art}`} style={{ aspectRatio }}>
        <picture>
          <source srcSet={`/devices/${id}/body.avif`} type="image/avif" />
          {/* eslint-disable-next-line @next/next/no-img-element -- the device's art, sized by its layout */}
          <img src={`/devices/${id}/body.webp`} alt="" width={size.width} height={size.height} className={styles.body} />
        </picture>
        <div
          className={`${styles.screen} ${styles.inCutOut}`}
          style={{ left: pct(screen.x), top: pct(screen.y), width: pct(screen.w), height: pct(screen.h) }}
          data-device-screen
        >
          {children}
        </div>
      </div>
    );
  }

  // Padding in % is of the frame's width, so the vertical margins are scaled by the body's ratio.
  const ratio = size.height / size.width;
  const bezel: CSSProperties = {
    aspectRatio,
    paddingLeft: pct(screen.x),
    paddingRight: pct(1 - screen.x - screen.w),
    paddingTop: pct(screen.y * ratio),
    paddingBottom: pct((1 - screen.y - screen.h) * ratio),
  };
  return (
    <div role="group" aria-label={label} data-device={id} className={`${styles.frame} ${styles.standIn}`} style={bezel}>
      <div className={styles.screen} data-device-screen>
        {children}
      </div>
    </div>
  );
}
