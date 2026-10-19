"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { decideEntrance, getHero, resetEntranceDecision } from "@/lib/three/heroReady";
import { boostReels } from "./useReelMotion";
import styles from "./Entrance.module.css";

const TEXT = "01 about";
const SKIP = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
const WAIT = 5000; // ms the dark waits for the 3D player before going on without it

/**
 * On every load of the home page, the page opens as the player's dark screen: a tape counter runs up, and
 * keeps winding while the 3D player loads (up to WAIT), then lands on SIDE A. The dark
 * shrinks into the player's own screen while the player appears
 * around it with its window empty, then the cassette drops in, the deck takes its weight,
 * the reels spin up, the keys rise, the knob swings to the first track and "01 about" types
 * out (docs/superpowers/specs/2026-10-18-motion-design.md, "The entrance"). The page works
 * throughout and any input finishes it at once. It never plays under reduced motion, at a
 * deep link, or coming back within the site (the prepaint gate in lib/powerOn.ts).
 *
 * Returns what the hero screen shows meanwhile, whether the LED is on, and the overlay.
 */
export function useEntrance(): { lines: string[] | undefined; led: boolean; overlay: ReactNode } {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<string[] | undefined>(undefined);
  const [led, setLed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (document.documentElement.dataset.boot === "pending") setRunning(true);
  }, []);

  useGSAP(
    () => {
      const overlay = box.current;
      const text = label.current;
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      const device = hero?.querySelector<HTMLElement>("[data-device]");
      if (!running || !overlay || !text || !hero || !device) return;
      const html = document.documentElement;
      html.dataset.boot = "running"; // the overlay takes over from the prepaint dark

      const q = <T extends HTMLElement>(sel: string) => [...hero.querySelectorAll<T>(sel)];
      const [cassette] = q("[data-cassette]");
      const [knob] = q("[data-knob]");
      const [lamp] = q("[data-led]");
      const keys = q("[data-tape-keys] > *");
      const knobAngle = knob?.style.rotate ?? "";
      const knobTransition = knob?.style.transition ?? "";
      const screenRect = () => getHero()?.screenRect() ?? hero.querySelector<HTMLElement>("[data-screen]")!.getBoundingClientRect();

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        boostReels(0);
        if (knob) {
          knob.style.rotate = knobAngle;
          knob.style.transition = knobTransition;
        }
        resetEntranceDecision();
        delete html.dataset.boot;
        setLines(undefined);
        setLed(false);
        setRunning(false);
      };

      // The counter runs the tape in; it keeps winding while the 3D player loads (the dark
      // waits for it, so the entrance plays in 3D), up to WAIT, then the rest plays.
      const counter = { n: 0 };
      const show = () => (text.textContent = String(Math.round(counter.n) % 1000).padStart(3, "0"));
      const intro = gsap.to(counter, { n: 120, duration: 0.65, ease: "power2.out", delay: 0.1, onUpdate: show });
      // The flat device is what shows if the 3D can't run here or has given up.
      const flat = () => !html.dataset.gl || hero.hasAttribute("data-fallback");
      const began = performance.now();
      const tl = gsap.timeline({ paused: true, onComplete: finish });
      const winding = window.setInterval(() => {
        if (intro.isActive()) return;
        if (getHero() || flat() || performance.now() - began > WAIT) {
          window.clearInterval(winding);
          tl.play();
        } else {
          counter.n += 1;
          show();
        }
      }, 70);

      // SIDE A, then the dark shrinks into the screen of whichever player is there.
      tl.to(text, { opacity: 0.15, duration: 0.05, repeat: 3, yoyo: true, ease: "steps(1)" }, 0).call(() => (text.textContent = "SIDE A"), undefined, 0.1);
      const shrink = () =>
        tl
          .to(overlay, { left: () => screenRect().left, top: () => screenRect().top, width: () => screenRect().width, height: () => screenRect().height, borderRadius: 4, duration: 0.85, ease: "expo.inOut" }, 0.32)
          .to(text, { fontSize: () => screenRect().width * 0.15, duration: 0.85, ease: "expo.inOut" }, 0.32)
          .fromTo(device, { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 0.95, ease: "expo.out" }, 0.47);
      tl.call(() => {
        html.dataset.boot = "lit";
        setLines(["SIDE A"]);
        overlay.style.visibility = "hidden";
      }, undefined, 1.18);

      const drop = 1.07;
      const spriteMoves = () => {
        // The tape drops in and the deck takes its weight.
        if (cassette) tl.fromTo(cassette, { yPercent: -70, rotate: -4, scale: 1.05, opacity: 0 }, { yPercent: 0, rotate: 0, scale: 1, opacity: 1, duration: 0.6, ease: "power3.in" }, drop);
        tl.to(device, { y: "1.2%", duration: 0.08, ease: "power2.out" }, drop + 0.6).to(device, { y: 0, duration: 0.5, ease: "elastic.out(1, 0.45)" }, drop + 0.68);
        // The reels spin up past idle and ease back down.
        const reels = { v: 0 };
        tl.to(reels, { v: 14, duration: 0.5, ease: "power2.in", onUpdate: () => boostReels(reels.v) }, drop + 0.68).to(reels, { v: 0, duration: 0.9, ease: "power2.out", onUpdate: () => boostReels(reels.v) }, drop + 1.18);
        if (lamp) tl.call(() => setLed(true), undefined, drop + 0.7);
        if (keys.length) tl.fromTo(keys, { y: "4%", opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.42, ease: "back.out(2.2)", stagger: 0.075 }, drop + 0.75);
        if (knob) {
          knob.style.transition = "none";
          const dial = { a: -250 };
          const turn = () => (knob.style.rotate = `${dial.a}deg`);
          turn();
          tl.to(dial, { a: Number.parseFloat(knobAngle) || -135, duration: 0.9, ease: "back.out(1.3)", onUpdate: turn }, drop + 0.8);
        }
      };
      // The 3D player plays the tape load if it's ready; the flat device if the 3D can't run;
      // and if the 3D is still on its way after WAIT, the dark lifts and it appears alone.
      let decided = false;
      const decide = () => {
        if (decided) return;
        decided = true;
        const hero3d = decideEntrance();
        if (hero3d) {
          shrink();
          hero3d.entrance(tl, drop);
        } else if (flat()) {
          shrink();
          spriteMoves();
        } else tl.to(overlay, { opacity: 0, duration: 0.6, ease: "power2.out" }, 0.32);
      };
      tl.call(decide, undefined, 0.27);
      for (let i = 1; i <= TEXT.length; i++) tl.call(() => setLines(["SIDE A", TEXT.slice(0, i)]), undefined, drop + 0.9 + i * 0.035);

      // Never in the way: any input finishes it at once.
      const skip = () => {
        window.clearInterval(winding);
        intro.progress(1);
        decide(); // so the jump to the end lands every move, whichever device plays them
        if (tl.progress() < 1) tl.progress(1);
        finish();
      };
      SKIP.forEach((e) => window.addEventListener(e, skip, { capture: true, passive: true }));
      return () => {
        SKIP.forEach((e) => window.removeEventListener(e, skip, { capture: true }));
        window.clearInterval(winding);
        intro.kill();
        finish();
      };
    },
    { dependencies: [running], revertOnUpdate: true },
  );

  const overlay = running ? (
    <div ref={box} className={styles.boot} aria-hidden="true" data-boot-screen>
      <span ref={label} className={styles.label}>
        000
      </span>
    </div>
  ) : null;
  return { lines, led, overlay };
}
