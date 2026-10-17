import type { Metadata } from "next";
import type { ReactNode } from "react";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Edit the tape · Miel",
  robots: { index: false, follow: false },
};

/** The owner's workspace: a plain tool in the site's tokens, without the device or the dock. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
