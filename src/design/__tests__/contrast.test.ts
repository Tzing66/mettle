import { darkTheme, lightTheme, rankColors, rankInk, type Theme } from '../tokens';

// WCAG 2 contrast ratio between two #RRGGBB colours.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([lightTheme, darkTheme])('$scheme theme contrast', (theme: Theme) => {
  const c = theme.colors;
  it.each([
    ['ink on bg', c.ink, c.bg, 7],
    ['ink on surface', c.ink, c.surface, 7],
    ['inkMuted on surface', c.inkMuted, c.surface, 4.5],
    ['onPrimary on primary', c.onPrimary, c.primary, 7],
    ['onAccent on accent', c.onAccent, c.accent, 4.5],
    ['accentInk on accentSoft', c.accentInk, c.accentSoft, 4.5],
    ['accentInk on surface', c.accentInk, c.surface, 4.5],
    ['xpInk on xp', c.xpInk, c.xp, 4.5],
    ['prInk on pr', c.prInk, c.pr, 4.5],
  ])('%s ≥ %s:1', (_label, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min as number);
  });

  it('category tile ink is readable on its tint', () => {
    for (const { tint, ink } of Object.values(theme.categoryColors)) expect(contrast(ink, tint)).toBeGreaterThanOrEqual(4.5);
  });
});

it('rank letters are readable on their tiles', () => {
  for (const r of Object.keys(rankColors) as (keyof typeof rankColors)[]) {
    expect(contrast(rankInk[r], rankColors[r])).toBeGreaterThanOrEqual(4.5);
  }
});
