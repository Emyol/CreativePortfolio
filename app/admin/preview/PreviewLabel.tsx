import styles from "./preview.module.css";

/** Always on screen in the preview, so it is never mistaken for the live tape. */
export function PreviewLabel() {
  return (
    <p className={styles.label}>
      <span>Preview: not published</span>
      <a href="/admin">Back to the editor</a>
    </p>
  );
}
