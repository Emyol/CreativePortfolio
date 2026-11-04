import type { Metadata } from "next";
import { TrackRoute } from "@/components/desk/TrackRoute";

export const revalidate = 3600;

export const generateMetadata = (): Metadata => ({ title: "on rotation · Miel" });

export default function Page() {
  return <TrackRoute id="on-rotation" />;
}
