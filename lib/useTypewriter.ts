"use client";
import { useEffect, useRef, useState } from "react";

const CHAR_MS = 28;

/** Reveals text a character at a time while active; shows it whole otherwise. */
export function useTypewriter(text: string, active: boolean, onDone: () => void): string {
  const [count, setCount] = useState(active ? 0 : text.length);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) {
        window.clearInterval(id);
        done.current();
      }
    }, CHAR_MS);
    return () => window.clearInterval(id);
  }, [text, active]);

  return text.slice(0, count);
}
