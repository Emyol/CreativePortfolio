import type { ComponentProps } from "react";

/** Japanese text: sets lang so screen readers and fonts treat it correctly. */
export function Ja(props: ComponentProps<"span">) {
  return <span lang="ja" {...props} />;
}
