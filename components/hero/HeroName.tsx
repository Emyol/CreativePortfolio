"use client";
import { StrokeWord } from "@/components/kanji/StrokeWord";
import styles from "./Hero.module.css";

export function HeroName() {
  return <StrokeWord text="ミエル" mode="write" className={styles.kana} charClassName={styles.kanaChar} />;
}
