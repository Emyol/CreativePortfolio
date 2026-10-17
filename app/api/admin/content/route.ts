import { getDraft } from "@/lib/content/repository";
import { contentSchema } from "@/lib/content/schema";
import { failure, json, readBody, sameOrigin } from "@/lib/supabase/http";
import { AdminError, requireOwner } from "@/lib/supabase/server";

export async function GET() {
  try {
    return json(await getDraft());
  } catch (e) {
    return failure(e);
  }
}

/** Saves the draft. Content the tape would refuse is never saved; the field is named. */
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const client = await requireOwner();
    const { content, revision } = await readBody(request);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new AdminError("Invalid revision.");
    const parsed = contentSchema.safeParse(content);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return json({ error: issue.message, path: issue.path }, 400);
    }
    const { data, error } = await client.rpc("save_tape_draft", { new_content: parsed.data, expected_revision: revision });
    if (error) {
      const conflict = error.message.includes("revision_conflict");
      throw new AdminError(conflict ? "Saved somewhere else since. Reload to get the latest." : "Couldn't save the draft.", conflict ? 409 : 500);
    }
    return json({ revision: data });
  } catch (e) {
    return failure(e);
  }
}
