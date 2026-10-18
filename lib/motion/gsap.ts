"use client";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin, useGSAP);

export { gsap, ScrollTrigger, Draggable, InertiaPlugin, useGSAP };
