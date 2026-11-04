import type { Metadata } from "next";
import { TrackRoute } from "@/components/desk/TrackRoute";

export const revalidate = 3600;

export const generateMetadata = (): Metadata => ({ title: "about · Miel" });

export default function Page() {
  return <TrackRoute id="about" />;
}
