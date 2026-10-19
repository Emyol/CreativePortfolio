import Link from "next/link";
import type { CSSProperties } from "react";
import { Sprite } from "@/components/device/Sprite";
import { KeysToggle } from "@/components/game/KeysToggle";
import { SoundToggle } from "@/components/game/SoundToggle";
import type { FooterLink, SiteContent } from "@/lib/content/schema";
import { DEVICE, pct, type Rect } from "@/lib/device/layout";
import styles from "./Underside.module.css";
import { UndersideDevice } from "./UndersideDevice";

const place = (r: Rect): CSSProperties => ({ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) });

// The battery door on the right of the underside (art/blender/side-a/device.py: Door).
const DOOR: Rect = { x: 0.625, y: 0.27, w: 0.245, h: 0.46 };

// A decorative barcode for the sticker: fixed bars, no meaning.
const BARS = [3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 1, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2];

type Props = { toolbox: SiteContent["about"]["toolbox"]; links: FooterLink[] };

/**
 * The footer is the device turned over: rubber feet, a spec sticker carrying the toolbox
 * as live text, and the owner's links printed on the battery door. On full motion the 3D
 * player turns over into it (UndersideDevice).
 */
export function Underside({ toolbox, links }: Props) {
  return (
    <footer className={styles.footer}>
      <UndersideDevice className={styles.device}>
        <Sprite name="underside" className={styles.art} />
        <div className={styles.sticker} style={place(DEVICE.underside.sticker)} data-anchor="sticker">
          <p className={styles.brand}>
            <span>miel</span>
            <span>pocket tape player</span>
          </p>
          {toolbox.length > 0 && (
            <>
              <h2 id="spec-title" className={styles.specTitle}>spec</h2>
              <ul aria-labelledby="spec-title" className={styles.spec}>
                {toolbox.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </>
          )}
          <span className={styles.barcode} aria-hidden="true">
            {BARS.map((w, i) => (
              <i key={i} style={{ width: `${w * 0.18}cqw`, background: i % 2 ? "transparent" : undefined }} />
            ))}
          </span>
        </div>
        {links.length > 0 && (
          <ul className={styles.door} style={place(DOOR)} aria-label="Links" data-anchor="door">
            {links.map((l) => (
              <li key={l.url}>
                <a href={l.url}>{l.label}</a>
              </li>
            ))}
          </ul>
        )}
      </UndersideDevice>
      <div className={styles.meta}>
        <p>Fonts: Archivo, Space Mono and Doto, from Google Fonts under the OFL.</p>
        <p><Link href="/tracklist">Track list</Link></p>
        <p className={styles.toggles}>
          <SoundToggle />
          <KeysToggle />
        </p>
      </div>
    </footer>
  );
}
