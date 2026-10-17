"use client";
import type { StrokeMode } from "@/components/kanji/StrokeKanji";
import { StrokeWord } from "@/components/kanji/StrokeWord";
import { useEntrance, type EntrancePhase } from "./Entrance";
import styles from "./Hero.module.css";

const MODE: Record<EntrancePhase, StrokeMode> = { unroll: "idle", write: "write", menu: "done", done: "done" };

export function HeroName() {
  const { phase, nameWritten } = useEntrance();
  return <StrokeWord text="ミエル" mode={MODE[phase]} onDone={nameWritten} className={styles.kana} charClassName={styles.kanaChar} />;
}
