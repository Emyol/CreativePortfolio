// The desk itself is the layout. The home route is its main region (the skip link's #jcard)
// with the desk's one heading: Miel's name, as the player prints it on its plate (the 3D or
// the sprite drawing), so it is read rather than shown twice.
export const revalidate = 3600;

export default function Page() {
  return (
    <main id="jcard" tabIndex={-1}>
      <h1 className="sr-only">Miel</h1>
    </main>
  );
}
