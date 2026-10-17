import { revalidatePath, revalidateTag } from "next/cache";
import { TAPE_TAG } from "@/lib/content/repository";
import { contentSchema } from "@/lib/content/schema";
import { failure, json, readBody, sameOrigin } from "@/lib/supabase/http";
import { AdminError, requireOwner } from "@/lib/supabase/server";

/** Publishes the saved draft at `revision`, then makes it live at once. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const client = await requireOwner();
    const { revision } = await readBody(request);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new AdminError("Save the draft before publishing.");
    // Drafts may be unfinished; only content the tape can render is published.
    const { data: draft, error: readError } = await client.from("tape_draft").select("content,revision").eq("id", 1).maybeSingle();
    if (readError || !draft) throw new AdminError("Couldn't read the draft. Try again.", 503);
    const parsed = contentSchema.safeParse(draft.content);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return json({ error: `Fix this first: ${issue.message}`, path: issue.path }, 400);
    }
    const { error } = await client.rpc("publish_tape", { expected_revision: revision });
    if (error) {
      if (error.message.includes("revision_conflict")) throw new AdminError("The draft changed somewhere else. Reload before publishing.", 409);
      if (error.message.includes("missing_asset")) throw new AdminError("Couldn't publish: a photo in the draft is missing.", 500);
      throw new AdminError("Couldn't publish. Try again.", 500);
    }
    revalidateTag(TAPE_TAG, { expire: 0 });
    revalidatePath("/");
    revalidatePath("/tracklist");
    revalidatePath("/events/[slug]", "page");
    return json({ published: true });
  } catch (e) {
    return failure(e);
  }
}
