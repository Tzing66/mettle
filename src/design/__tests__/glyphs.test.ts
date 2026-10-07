import catalogue from '@config/exercises.json';

import { GLYPH_NAMES, GLYPHS, isGlyphName } from '../icons/glyphs';

describe('exercise glyphs', () => {
  it('every catalogue exercise points at a real glyph', () => {
    const missing = catalogue.exercises.filter((e) => !isGlyphName(e.icon)).map((e) => e.name);
    expect(missing).toEqual([]);
  });

  it('every glyph is used by at least one exercise', () => {
    const used = new Set(catalogue.exercises.map((e) => e.icon));
    expect(GLYPH_NAMES.filter((g) => !used.has(g))).toEqual([]);
  });

  it('glyphs stay inside the 48×48 grid', () => {
    for (const shapes of Object.values(GLYPHS)) {
      for (const s of shapes) {
        if (s.t !== 'path') {
          expect(s.x).toBeGreaterThanOrEqual(0);
          expect(s.x).toBeLessThanOrEqual(48);
        }
      }
    }
  });
});
