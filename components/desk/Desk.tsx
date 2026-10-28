"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { SiteContent } from "@/lib/content/schema";
import { hashRedirect } from "@/lib/desk/location";

/** The persistent desk. Skeleton: later tasks add the 3D scene, dock and J-card around the route. */
export function Desk({ base, children }: { content: SiteContent; base: string; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const to = hashRedirect(location.pathname, location.hash, base);
    if (to) router.replace(to);
  }, [router, base]);
  return <div data-desk-root>{children}</div>;
}
