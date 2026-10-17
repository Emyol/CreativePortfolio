import { notFound, redirect } from "next/navigation";
import { EventPageBody } from "@/components/tape/EventPageBody";
import { previewable } from "@/components/tape/preview";
import { getDraft } from "@/lib/content/repository";
import { getAdminStatus } from "@/lib/supabase/server";
import { PreviewLabel } from "../../PreviewLabel";

export const dynamic = "force-dynamic";

export default async function PreviewEvent({ params }: { params: Promise<{ slug: string }> }) {
  if ((await getAdminStatus()).status !== "ready") redirect("/admin");
  const { slug } = await params;
  const { content, hidden } = previewable((await getDraft()).content);
  const event = content.events.find((e) => e.slug === slug);
  if (!event) notFound();
  return (
    <>
      <PreviewLabel hidden={hidden} />
      <EventPageBody content={content} event={event} home="/admin/preview" />
    </>
  );
}
