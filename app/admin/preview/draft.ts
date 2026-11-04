import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { previewable } from "@/components/tape/preview";
import { getDraft } from "@/lib/content/repository";
import { getAdminStatus } from "@/lib/supabase/server";

/** Where the preview's desk paths start (lib/desk/location): every link and step back stays under it. */
export const PREVIEW_BASE = "/admin/preview";

/**
 * The draft as the preview shows it, for the signed-in owner only: anyone else goes to the
 * admin, which offers the sign-in. Every preview route asks, not only the layout (a layout
 * doesn't render again on a move within it), and a request asks once.
 */
export const previewDraft = cache(async () => {
  if ((await getAdminStatus()).status !== "ready") redirect("/admin");
  return previewable((await getDraft()).content);
});
