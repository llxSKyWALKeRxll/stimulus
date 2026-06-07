// Generates the Stimulus app icon (a dumbbell, Onyx & Champagne theme).
// Requires sharp:  npm i -D sharp
// Run from the project root:  node scripts/generate-icons.mjs
//
// Writes both the source assets (assets/images/*) used by app.json AND the
// already-baked Android res mipmaps, so the launcher icon updates without a
// full `expo prebuild` (which would wipe our manual native edits).

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ONYX = '#0A0A0B';
const GOLD_TOP = '#E0C58C';
const GOLD_MID = '#C9A86A';
const GOLD_BOT = '#A9844E';

const ROOT = process.cwd();
const ASSETS = path.join(ROOT, 'assets', 'images');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

/**
 * Build a dumbbell SVG.
 * @param {number} px   square canvas size
 * @param {number} frac fraction of the canvas the dumbbell width spans
 * @param {string|null} bg  background fill, or null for transparent
 * @param {boolean} mono  flat white (for the Android monochrome layer)
 */
function dumbbell(px, frac, bg, mono = false) {
  // Design box: 100 wide x 56 tall, centered.
  const DW = 100;
  const DH = 56;
  const dw = px * frac;
  const s = dw / DW;
  const dh = DH * s;
  const ox = (px - dw) / 2;
  const oy = (px - dh) / 2;
  const X = (x) => (ox + x * s).toFixed(2);
  const Y = (y) => (oy + y * s).toFixed(2);
  const S = (v) => (v * s).toFixed(2);

  // [x, y, w, h, r] in design units. Horizontal dumbbell.
  const parts = [
    [0, 0, 16, 56, 5], // left outer plate
    [19, 11, 9, 34, 3], // left collar
    [28, 21, 44, 14, 7], // bar
    [72, 11, 9, 34, 3], // right collar
    [84, 0, 16, 56, 5], // right outer plate
  ];

  const fill = mono ? '#FFFFFF' : 'url(#g)';
  const rects = parts
    .map(([x, y, w, h, r]) => `<rect x="${X(x)}" y="${Y(y)}" width="${S(w)}" height="${S(h)}" rx="${S(r)}" ry="${S(r)}" fill="${fill}"/>`)
    .join('');

  const defs = mono
    ? ''
    : `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${GOLD_TOP}"/>
        <stop offset="0.5" stop-color="${GOLD_MID}"/>
        <stop offset="1" stop-color="${GOLD_BOT}"/>
      </linearGradient></defs>`;
  const bgRect = bg ? `<rect width="${px}" height="${px}" fill="${bg}"/>` : '';

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">${defs}${bgRect}${rects}</svg>`,
  );
}

const solid = (px, color) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><rect width="${px}" height="${px}" fill="${color}"/></svg>`);

const png = (svg, out) => sharp(svg).png().toFile(out);
const webp = (svg, out) => sharp(svg).webp({ lossless: true }).toFile(out);

const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const ADAPTIVE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const SPLASH = { mdpi: 288, hdpi: 432, xhdpi: 576, xxhdpi: 864, xxxhdpi: 1152 };

async function main() {
  await mkdir(ASSETS, { recursive: true });

  // ---- Source assets (app.json) ----
  await png(dumbbell(1024, 0.58, ONYX), path.join(ASSETS, 'icon.png'));
  await png(dumbbell(1024, 0.52, null), path.join(ASSETS, 'android-icon-foreground.png'));
  await png(solid(1024, ONYX), path.join(ASSETS, 'android-icon-background.png'));
  await png(dumbbell(1024, 0.52, null, true), path.join(ASSETS, 'android-icon-monochrome.png'));
  await png(dumbbell(1024, 0.62, null), path.join(ASSETS, 'splash-icon.png'));
  await png(dumbbell(48, 0.64, ONYX), path.join(ASSETS, 'favicon.png'));

  // ---- Baked Android res mipmaps ----
  for (const [d, n] of Object.entries(LEGACY)) {
    const dir = path.join(RES, `mipmap-${d}`);
    await webp(dumbbell(n, 0.58, ONYX), path.join(dir, 'ic_launcher.webp'));
    await webp(dumbbell(n, 0.58, ONYX), path.join(dir, 'ic_launcher_round.webp'));
  }
  for (const [d, n] of Object.entries(ADAPTIVE)) {
    const dir = path.join(RES, `mipmap-${d}`);
    await webp(solid(n, ONYX), path.join(dir, 'ic_launcher_background.webp'));
    await webp(dumbbell(n, 0.52, null), path.join(dir, 'ic_launcher_foreground.webp'));
    await webp(dumbbell(n, 0.52, null, true), path.join(dir, 'ic_launcher_monochrome.webp'));
  }

  // ---- Native splash logo (expo-splash-screen) ----
  for (const [d, n] of Object.entries(SPLASH)) {
    await png(dumbbell(n, 0.82, null), path.join(RES, `drawable-${d}`, 'splashscreen_logo.png'));
  }

  console.log('Icons generated.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
