import styles from "./preview.module.css";

/** Always on screen in the preview, so it is never mistaken for the live tape. */
export function PreviewLabel({ hidden }: { hidden: number }) {
  return (
    <p className={styles.label}>
      <span>Preview: not published</span>
      {hidden > 0 && <span>{hidden === 1 ? "1 unfinished entry isn't shown" : `${hidden} unfinished entries aren't shown`}</span>}
      <a href="/admin">Back to the editor</a>
    </p>
  );
}
