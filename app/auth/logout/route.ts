import { serverClient } from "@/lib/supabase/server";
import { sameOrigin, failure } from "@/lib/supabase/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const client = await serverClient();
    await client.auth.signOut();
    return Response.redirect(
      new URL("/admin", process.env.SITE_URL || request.url),
      303,
    );
  } catch (e) {
    return failure(e);
  }
}
