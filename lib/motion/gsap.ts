"use client";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin, useGSAP);

  // A refresh lifts each pinned section out of its spacer and back, which drops focus from
  // anything inside it (a heading a key or "Back to events" just focused). Put it back.
  let focused: HTMLElement | null = null;
  ScrollTrigger.addEventListener("refreshInit", () => {
    const el = document.activeElement;
    focused = el instanceof HTMLElement && el !== document.body ? el : null;
  });
  ScrollTrigger.addEventListener("refresh", () => {
    if (focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
    focused = null;
  });
}

export { gsap, ScrollTrigger, Draggable, InertiaPlugin, useGSAP };
