import { TapePage } from "@/components/tape/TapePage";
import { getContent } from "@/lib/content/load";

// Rebuilt hourly and whenever the tape is published; a failed rebuild keeps the last good page.
export const revalidate = 3600;

export default async function Home() {
  return <TapePage content={await getContent()} />;
}
