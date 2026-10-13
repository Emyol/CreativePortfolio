import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Klee_One, Shippori_Mincho_B1, Yuji_Syuku, Zen_Kaku_Gothic_New } from "next/font/google";
import "lenis/dist/lenis.css";
import { HashLinks } from "@/components/motion/HashLinks";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { MotionProvider } from "@/lib/motion/MotionProvider";
import { BROCADE, GOLD, SEAL_RED, seasonVars } from "@/lib/seasons";
import "./globals.css";

// CJK fonts are large; preload: false lets the browser fetch only the unicode-range slices it uses.
const brush = Yuji_Syuku({ weight: "400", subsets: ["latin"], variable: "--font-brush", display: "swap", preload: false });
const heading = Shippori_Mincho_B1({ weight: ["500", "700"], subsets: ["latin"], variable: "--font-heading", display: "swap", preload: false });
const hand = Klee_One({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-hand", display: "swap", preload: false });
const body = Zen_Kaku_Gothic_New({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Miel",
  description: "Miel's hanging scroll: events, music, hobbies, the shelf and the people around him.",
};

const rootVars = { ...seasonVars("top"), "--seal": SEAL_RED, "--brocade": BROCADE, "--gold": GOLD } as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  const fonts = [brush, heading, hand, body].map((f) => f.variable).join(" ");
  return (
    <html lang="en" className={fonts} style={rootVars}>
      <head>
        <noscript>
          <style>{`[data-mask]{stroke-dashoffset:0!important;stroke-width:40px!important}[data-pen-group]{opacity:0!important}`}</style>
        </noscript>
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <a className="skip-link" href="/mokuroku">Skip to the plain index</a>
        <MotionProvider>
          <SmoothScroll />
          <HashLinks />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
