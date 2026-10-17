import { getDraft } from "@/lib/content/repository";
import { draftSchema } from "@/lib/content/schema";
import { failure, json, readBody, sameOrigin } from "@/lib/supabase/http";
import { AdminError, requireOwner } from "@/lib/supabase/server";

export async function GET() {
  try {
    return json(await getDraft());
  } catch (e) {
    return failure(e);
  }
}

/**
 * Saves the draft, finished or not: autosave must never lose work in progress. Publishing
 * is where the tape's full rules apply (see the publish route).
 */
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const client = await requireOwner();
    const { content, revision } = await readBody(request);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new AdminError("Invalid revision.");
    const parsed = draftSchema.safeParse(content);
    if (!parsed.success) throw new AdminError("That isn't a tape draft.");
    const { data, error } = await client.rpc("save_tape_draft", { new_content: parsed.data, expected_revision: revision });
    if (error) {
      if (error.message.includes("revision_conflict")) throw new AdminError("Saved somewhere else since. Reload to get the latest.", 409);
      if (error.message.includes("invalid_content")) throw new AdminError("This draft is too big to save. Remove something long and try again.", 413);
      if (error.message.includes("forbidden")) throw new AdminError("This GitHub account isn't the tape's owner.", 403);
      throw new AdminError("Couldn't save the draft.", 500, { cause: error });
    }
    return json({ revision: data });
  } catch (e) {
    return failure(e);
  }
}
