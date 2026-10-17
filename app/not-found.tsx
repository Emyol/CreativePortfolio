import Link from "next/link";
import { Sprite } from "@/components/device/Sprite";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <Sprite name="beauty" className={styles.art} width={2400} height={1260} eager />
      <h1 className={styles.title}>Nothing on this side of the tape.</h1>
      <p className={styles.back}>
        <Link href="/">Back to the tape</Link>
      </p>
    </main>
  );
}
