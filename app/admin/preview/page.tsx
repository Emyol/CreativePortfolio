import { redirect } from "next/navigation";
import { previewable } from "@/components/tape/preview";
import { TapePage } from "@/components/tape/TapePage";
import { getDraft } from "@/lib/content/repository";
import { getAdminStatus } from "@/lib/supabase/server";
import { PreviewLabel } from "./PreviewLabel";

export const dynamic = "force-dynamic";

/** The draft on the real tape, owner-only and never cached. */
export default async function Preview() {
  if ((await getAdminStatus()).status !== "ready") redirect("/admin");
  const { content, hidden } = previewable((await getDraft()).content);
  return (
    <>
      <PreviewLabel hidden={hidden} />
      <TapePage content={content} eventHref={(slug) => `/admin/preview/events/${slug}`} />
    </>
  );
}
