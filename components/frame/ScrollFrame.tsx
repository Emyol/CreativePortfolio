import type { ReactNode } from "react";
import styles from "./ScrollFrame.module.css";

export function Roller() {
  return (
    <div className={styles.roller} aria-hidden="true">
      <span className={styles.cap} />
      <span className={styles.cap} />
    </div>
  );
}

export function ScrollFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wall}>
      <div className={styles.hang} data-scroll-frame>
        <div className={styles.cord} aria-hidden="true" />
        <Roller />
        <div className={styles.brocade}>
          <div className={styles.paper}>{children}</div>
        </div>
      </div>
    </div>
  );
}
