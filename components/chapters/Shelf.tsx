"use client";
import { useEffect, useReducer, useRef } from "react";
import type { ShelfItem } from "@/lib/content/schema";
import { useMotionTier } from "@/lib/motion/MotionProvider";
import { dialogueReducer, splitPages } from "@/lib/shelf";
import { useTypewriter } from "@/lib/useTypewriter";
import styles from "./Shelf.module.css";

const KIND_LABEL: Record<ShelfItem["kind"], string> = { manga: "Manga", game: "Game", anime: "Anime" };

export function Shelf({ items }: { items: ShelfItem[] }) {
  const tier = useMotionTier();
  const [state, dispatch] = useReducer(dialogueReducer, { open: false });
  const spines = useRef<(HTMLButtonElement | null)[]>([]);
  const nextButton = useRef<HTMLButtonElement>(null);
  const lastItem = useRef<number | null>(null);

  const current = state.open ? items[state.item] : null;
  const pages = current ? splitPages(current.note) : [];
  const text = state.open ? (pages[state.page] ?? "") : "";
  const typing = state.open && !state.typed && tier !== "none";
  const typed = useTypewriter(text, typing, () => dispatch({ type: "typed" }));
  const visible = typing ? typed : text;
  const isLastPage = state.open && state.page === pages.length - 1;

  // Without the typewriter (reduced motion) a page is typed the moment it shows.
  useEffect(() => {
    if (state.open && !state.typed && tier === "none") dispatch({ type: "typed" });
  }, [state, tier]);

  // Opening moves focus to the dialogue's button; closing returns it to the spine.
  const openItem = state.open ? state.item : null;
  useEffect(() => {
    if (openItem !== null) {
      lastItem.current = openItem;
      nextButton.current?.focus();
    } else if (lastItem.current !== null) {
      spines.current[lastItem.current]?.focus();
      lastItem.current = null;
    }
  }, [openItem]);

  const label = typing ? "Skip" : isLastPage ? "Close" : "Next";

  return (
    <div className={styles.shelf}>
      <ul className={styles.row} aria-label="Shelf">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`}>
            <button
              ref={(el) => {
                spines.current[i] = el;
              }}
              type="button"
              className={styles.spine}
              data-kind={item.kind}
              aria-expanded={state.open && state.item === i}
              aria-controls="shelf-dialogue"
              onClick={() => dispatch({ type: "select", item: i })}
            >
              <span className={styles.spineTitle}>{item.title}</span>
              <span className={styles.kind}>{KIND_LABEL[item.kind]}</span>
            </button>
          </li>
        ))}
      </ul>

      <div
        id="shelf-dialogue"
        className={styles.dialogue}
        data-open={state.open}
        onKeyDown={(e) => {
          if (e.key === "Escape") dispatch({ type: "close" });
        }}
      >
        {current ? (
          <>
            <p className={styles.speaker}>{current.title}</p>
            <p className={styles.text} aria-hidden="true">
              {visible}
              <span className={styles.caret} data-typing={typing} />
            </p>
            <button ref={nextButton} type="button" className={styles.next} onClick={() => dispatch({ type: "advance", pages: pages.length })}>
              {label}
              <span aria-hidden="true"> ▼</span>
            </button>
          </>
        ) : (
          <p className={styles.hint}>Pick something off the shelf.</p>
        )}
        <p className="sr-only" aria-live="polite">{current ? `${current.title}. ${text}` : ""}</p>
      </div>
    </div>
  );
}
