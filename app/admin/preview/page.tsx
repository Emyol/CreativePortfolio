import { previewDraft } from "./draft";

export const dynamic = "force-dynamic";

/** The desk with no tape in, as the public home: its main region and its one heading. */
export default async function Preview() {
  await previewDraft();
  return (
    <main id="main" tabIndex={-1}>
      <h1 className="sr-only">Miel</h1>
    </main>
  );
}
