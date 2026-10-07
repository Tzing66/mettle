// Renders every glyph to one SVG sheet for eyeballing:
//   node scripts/preview-glyphs.ts > /tmp/glyphs.svg
import { GLYPHS, type GlyphShape } from '../src/design/icons/glyphs.ts';

const CELL = 120;
const COLS = 6;
const names = Object.keys(GLYPHS) as (keyof typeof GLYPHS)[];
const rows = Math.ceil(names.length / COLS);

function shape(s: GlyphShape, ink: string): string {
  if (s.t === 'head') return `<circle cx="${s.x}" cy="${s.y}" r="3.6" fill="${ink}"/>`;
  if (s.t === 'plate') {
    const h = s.h ?? 9;
    return `<rect x="${s.x - 1.75}" y="${s.y - h / 2}" width="3.5" height="${h}" rx="1.2" fill="${ink}"/>`;
  }
  return `<path d="${s.d}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * CELL}" viewBox="0 0 ${COLS * CELL} ${rows * CELL}">`;
out += `<rect width="100%" height="100%" fill="#F6F6F3"/>`;
names.forEach((name, i) => {
  const x = (i % COLS) * CELL;
  const y = Math.floor(i / COLS) * CELL;
  out += `<g transform="translate(${x + 10} ${y + 6})"><rect width="100" height="86" rx="14" fill="#E3EEE7"/>`;
  out += `<g transform="translate(26 19)">${GLYPHS[name].map((s) => shape(s, '#2F6B4F')).join('')}</g></g>`;
  out += `<text x="${x + 60}" y="${y + 110}" font-family="Helvetica" font-size="13" text-anchor="middle" fill="#16181D">${name}</text>`;
});
out += '</svg>';
process.stdout.write(out);
