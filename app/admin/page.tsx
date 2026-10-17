import { AdminEditor } from "@/components/admin/AdminEditor";
import { getDraft } from "@/lib/content/repository";
import { getAdminStatus } from "@/lib/supabase/server";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className={styles.notice}>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const state = await getAdminStatus();
  const { error } = await searchParams;

  if (state.status === "setup") {
    return (
      <Notice title="Edit the tape">
        <p>Connect Supabase using docs/admin-setup.md.</p>
      </Notice>
    );
  }
  if (state.status === "signed-out") {
    return (
      <Notice title="Edit the tape">
        {error === "login" && <p role="alert">Sign-in didn&apos;t finish. Try again.</p>}
        <p>Sign in with the GitHub account that owns the tape.</p>
        <a className={styles.primary} href="/auth/login">Sign in with GitHub</a>
      </Notice>
    );
  }
  if (state.status === "forbidden") {
    return (
      <Notice title="Not the owner">
        <p>This GitHub account isn&apos;t the tape&apos;s owner.</p>
        <form action="/auth/logout" method="post">
          <button className={styles.secondary} type="submit">Sign out</button>
        </form>
      </Notice>
    );
  }
  if (state.status === "error") {
    return (
      <Notice title="Edit the tape">
        <p role="alert">{state.message ?? "The admin is unavailable right now."}</p>
      </Notice>
    );
  }

  const draft = await getDraft();
  return (
    <main id="main" tabIndex={-1}>
      <AdminEditor initialContent={draft.content} initialRevision={draft.revision} />
    </main>
  );
}
