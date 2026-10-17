// Encodes the Blender renders in art/blender/side-a/out/ into the files the site serves
// from public/device/: AVIF and WebP for every sprite, WebP for the flip frames, and a
// 1200x630 JPEG of the beauty shot for the social card. Blender cannot write AVIF itself.
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";

const IN = "art/blender/side-a/out/";
const OUT = "public/device/";
const SPRITES = ["plate", "shadow", "shell-a", "shell-b", "hub", "pack", "knob", "knob-mark", "key-up", "key-down", "underside", "beauty"];

mkdirSync(OUT + "flip", { recursive: true });

// The dock's knob sprite carries its contact shadow; feather the canvas edge so the soft
// shadow never ends in a visible square.
async function feathered(file) {
  const img = sharp(IN + file);
  const { width, height } = await img.metadata();
  const r = width / 2;
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><defs><radialGradient id="g"><stop offset="78%" stop-color="#fff"/><stop offset="100%" stop-color="#000"/></radialGradient></defs><circle cx="${r}" cy="${r}" r="${r}" fill="url(#g)"/></svg>`,
  );
  return sharp(await img.composite([{ input: mask, blend: "dest-in" }]).png().toBuffer());
}

// The contact shadow spreads to the canvas edge; fade the edge so it never ends in a line.
async function vignetted(file, share = 0.03) {
  const img = sharp(IN + file);
  const { width, height } = await img.metadata();
  const blur = Math.round(width * share);
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs><rect x="${blur * 2}" y="${blur * 2}" width="${width - blur * 4}" height="${height - blur * 4}" fill="#fff" filter="url(#b)"/></svg>`,
  );
  return sharp(await img.composite([{ input: mask, blend: "dest-in" }]).png().toBuffer());
}

for (const name of SPRITES) {
  const src = name === "knob" ? await feathered("knob.png") : name === "shadow" ? await vignetted("shadow.png") : name === "underside" ? await vignetted("underside.png", 0.01) : sharp(IN + name + ".png");
  const buf = await src.png().toBuffer();
  await sharp(buf).avif({ quality: 62, effort: 6 }).toFile(`${OUT}${name}.avif`);
  await sharp(buf).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(`${OUT}${name}.webp`);
  console.log("encoded", name);
}

await sharp(IN + "beauty.png").resize(1200, 630).flatten({ background: "#E4E6E9" }).jpeg({ quality: 86, mozjpeg: true }).toFile(OUT + "beauty.jpg");

const frames = readdirSync(IN).filter((f) => /^flip-\d\d\.png$/.test(f)).sort();
let total = 0;
for (const f of frames) {
  const info = await sharp(IN + f).webp({ quality: 72, alphaQuality: 80, effort: 6 }).toFile(OUT + "flip/" + f.replace(".png", ".webp"));
  total += info.size;
}
console.log(`encoded ${frames.length} flip frames, ${(total / 1024).toFixed(0)} KB total`);
