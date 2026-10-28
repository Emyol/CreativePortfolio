// The desk itself is the layout; the home route only supplies the skip link's target.
export const revalidate = 3600;

export default function Page() {
  return <main id="main" tabIndex={-1} />;
}
