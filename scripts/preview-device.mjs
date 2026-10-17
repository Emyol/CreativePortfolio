// Stacks the rendered device sprites the way the site does, using public/device/layout.json,
// so the art can be judged assembled. Writes art/blender/side-a/out/composite-<theme>.png.
// Usage: node scripts/preview-device.mjs [progress 0..1] [side a|b]
import sharp from "sharp";
import { readFileSync } from "node:fs";

const OUT = "art/blender/side-a/out/";
const L = JSON.parse(readFileSync("public/device/layout.json", "utf8"));
const progress = Number(process.argv[2] ?? 0.3);
const side = process.argv[3] ?? "a";
const { width: PW, height: PH } = L.plate;

async function placed(file, cx, cy, size, rotate = 0) {
  const px = Math.round(size * PW);
  let img = sharp(OUT + file).resize(px, px);
  if (rotate) img = sharp(await img.png().toBuffer()).rotate(rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize(px, px);
  return { input: await img.png().toBuffer(), left: Math.round(cx * PW - px / 2), top: Math.round(cy * PH - px / 2) };
}

async function rectSprite(file, r) {
  const w = Math.round(r.w * PW), h = Math.round(r.h * PH);
  return { input: await sharp(OUT + file).resize(w, h).png().toBuffer(), left: Math.round(r.x * PW), top: Math.round(r.y * PH) };
}

const dia = (f) => Math.sqrt(L.pack.min ** 2 + (L.pack.max ** 2 - L.pack.min ** 2) * f);
const layers = [
  { input: OUT + "shadow.png" },
  { input: OUT + "plate.png" },
  await placed("pack.png", L.reels.left.x, L.reels.left.y, dia(1 - progress)),
  await placed("pack.png", L.reels.right.x, L.reels.right.y, dia(progress)),
  await placed("hub.png", L.reels.left.x, L.reels.left.y, L.reels.hub, 17),
  await placed("hub.png", L.reels.right.x, L.reels.right.y, L.reels.hub, 41),
  await rectSprite(`shell-${side}.png`, L.cassette),
  await placed("knob-mark.png", L.knob.centre.x, L.knob.centre.y, L.knob.sprite, -45),
];
for (const [i, k] of L.keys.entries()) {
  const r = { x: k.x - L.keyPad.x, y: k.y - L.keyPad.y, w: k.w + 2 * L.keyPad.x, h: k.h + 2 * L.keyPad.y };
  layers.push(await rectSprite(i === 1 ? "key-down.png" : "key-up.png", r));
}
for (const [theme, bg] of [["light", "#E4E6E9"], ["dark", "#17181B"]]) {
  await sharp({ create: { width: PW, height: PH, channels: 4, background: bg } })
    .composite(layers)
    .png()
    .toFile(`${OUT}composite-${theme}.png`);
  console.log("wrote", `${OUT}composite-${theme}.png`);
}
