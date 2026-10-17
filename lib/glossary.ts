export type GlossaryEntry = { term: string; reading: string; meaning: string };

/** Every Japanese string the site shows. Checked by the owner before it ships. */
export const GLOSSARY: readonly GlossaryEntry[] = [
  { term: "掛軸", reading: "kakejiku", meaning: "hanging scroll, the shape of this site" },
  { term: "ミエル", reading: "Mieru", meaning: "Miel, written in katakana" },
  { term: "私", reading: "watashi", meaning: "I, me: the About chapter" },
  { term: "祭", reading: "matsuri", meaning: "festival: the Events chapter" },
  { term: "音", reading: "oto", meaning: "sound: the Music chapter" },
  { term: "趣", reading: "omomuki", meaning: "taste, pursuit: the Hobbies chapter" },
  { term: "棚", reading: "tana", meaning: "shelf: the Shelf chapter" },
  { term: "縁", reading: "en", meaning: "bond, connection: the People chapter" },
  { term: "春", reading: "haru", meaning: "spring, the season seal for About" },
  { term: "夏", reading: "natsu", meaning: "summer, the season seal for Events" },
  { term: "秋", reading: "aki", meaning: "autumn, the season seal for Music" },
  { term: "霜", reading: "shimo", meaning: "frost, the late-autumn seal for Hobbies" },
  { term: "冬", reading: "fuyu", meaning: "winter, the season seal for Shelf" },
  { term: "梅", reading: "ume", meaning: "plum blossom, the seal for People" },
  { term: "壱弐参肆伍", reading: "ichi, ni, san, shi, go", meaning: "one to five in formal numerals, numbering the setlist" },
  { term: "目録", reading: "mokuroku", meaning: "index, catalogue: the plain index page" },
  { term: "終", reading: "owari", meaning: "the end" },
  { term: "鶴", reading: "tsuru", meaning: "crane, from the Konami easter egg" },
];
