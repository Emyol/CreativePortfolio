import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, Doto, Space_Mono } from "next/font/google";
import { InlineScript } from "@/components/InlineScript";
import { NIGHT_PREPAINT } from "@/lib/desk/nightPrepaint";
import { MotionProvider } from "@/lib/motion/MotionProvider";
import { GL_PREPAINT } from "@/lib/powerOn";
import "./globals.css";

// One job each: Archivo (width axis) for display and body, Space Mono for what is printed
// on the device, Doto only for text lit on its screen.
const sans = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-sans", display: "swap" });
const mono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-mono", display: "swap" });
const dot = Doto({ subsets: ["latin"], variable: "--font-dot", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "Miel",
  description: "Miel's tape: the events he went to, the songs he loves and the people around him.",
  openGraph: { images: ["/device/beauty.jpg"] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={[sans.variable, mono.variable, dot.variable].join(" ")} suppressHydrationWarning>
      <head>
        <InlineScript html={GL_PREPAINT} />
        <InlineScript html={NIGHT_PREPAINT} />
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
