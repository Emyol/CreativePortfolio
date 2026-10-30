import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Edit the tape · Miel",
  robots: { index: false, follow: false },
};

/**
 * The owner's workspace, kept out of search engines. The editor is a plain tool in the
 * site's tokens (its page draws its own shell); the preview under it is the desk.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
