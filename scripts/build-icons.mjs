// Renders Mettle's app icon, Android adaptive-icon layers and splash image
// from the SVG mark below. Change the mark here and rerun:
//   node scripts/build-icons.mjs
// Current mark: concept B, "rank tile": the in-app rank-badge tile with an M.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const STONE = '#F6F6F3';
const SAGE = '#8FB8A0';
const SAGE_DEEP = '#2F6B4F';

/** The tile + M, drawn in a 1024 box, `size` px wide and centred. */
function mark(size, { mono = false } = {}) {
  const s = size / 600;
  const o = (1024 - size) / 2;
  const tile = mono
    ? `<rect x="0" y="0" width="600" height="600" rx="150" fill="none" stroke="#000" stroke-width="44"/>`
    : `<rect x="0" y="0" width="600" height="600" rx="150" fill="${SAGE}" stroke="${SAGE_DEEP}" stroke-opacity="0.15" stroke-width="8"/>`;
  const m = `<path d="M140 460 V140 L300 300 L460 140 V460" fill="none" stroke="${mono ? '#000' : SAGE_DEEP}" stroke-width="84" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<g transform="translate(${o} ${o}) scale(${s})">${tile}${m}</g>`;
}

const svg = (body, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}${body}</svg>`;

const outputs = {
  // iOS + default icon: full bleed, the OS rounds the corners.
  'assets/images/icon.png': svg(mark(600), STONE),
  // Android adaptive icon: transparent foreground kept inside the ~61% safe zone; background is a colour in app.json.
  'assets/images/android-icon-foreground.png': svg(mark(560)),
  // Android 13+ themed icon: single-colour silhouette.
  'assets/images/android-icon-monochrome.png': svg(mark(560, { mono: true })),
  // Splash: the mark on transparent, centred on the stone splash background.
  'assets/images/splash-icon.png': svg(mark(1000)),
};

/** Opaque RGB PNG (no alpha channel): App Store icons are rejected if they have one. */
function opaquePng(rendered) {
  const { width, height, pixels } = rendered; // RGBA
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.set(pixels.subarray(i, i + 3), y * (width * 3 + 1) + 1 + x * 3);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, colour type 2 (RGB)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [path, source] of Object.entries(outputs)) {
  const rendered = new Resvg(source, { fitTo: { mode: 'width', value: 1024 } }).render();
  writeFileSync(path, path.endsWith('/icon.png') ? opaquePng(rendered) : rendered.asPng());
  console.log(`wrote ${path}`);
}
