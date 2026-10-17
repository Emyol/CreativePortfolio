import Link from "next/link";
import { KeysToggle } from "@/components/game/KeysToggle";
import { SoundToggle } from "@/components/game/SoundToggle";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Fonts: Archivo, Space Mono and Doto, from Google Fonts under the OFL.</p>
      <p><Link href="/tracklist">Track list</Link></p>
      <p className={styles.toggles}>
        <SoundToggle />
        <KeysToggle />
      </p>
    </footer>
  );
}
