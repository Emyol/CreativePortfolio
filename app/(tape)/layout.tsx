import type { ReactNode } from "react";
import { Desk } from "@/components/desk/Desk";
import { SkipLinks } from "@/components/desk/SkipLinks";
import { getContent } from "@/lib/content/load";

// Rebuilt hourly and whenever the tape is published; a failed rebuild keeps the last good page.
export const revalidate = 3600;

export default async function TapeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLinks base="" />
      <Desk content={await getContent()} base="">
        {children}
      </Desk>
    </>
  );
}
