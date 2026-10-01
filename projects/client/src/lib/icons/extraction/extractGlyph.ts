import { parse } from 'opentype.js/dist/opentype.mjs';

interface ExtractGlyphParams {
  readonly font: ArrayBuffer;
  readonly codepoint: number;
}

interface ExtractedGlyph {
  readonly pathData: string;
  readonly width: number;
  readonly height: number;
}

// The baseline sits 7/8 of the way down a 1em box, as in Font Awesome's own SVGs (y = 448 of 512). Putting every family
// on the same baseline lets <Icon> use one vertical-align for all of them. OG's fonts disagree on ascender and
// descender, so using those instead would move each family by a different amount.
const BASELINE = 7 / 8;

/**
 * Reads one glyph as SVG path data in font units: y points down, the box is 1em tall, and the glyph keeps its exact
 * position relative to the baseline. Returns undefined when the font has no glyph for the codepoint.
 */
export function extractGlyph({ font, codepoint }: ExtractGlyphParams): ExtractedGlyph | undefined {
  const parsed = parse(font);
  const index = parsed.charToGlyphIndex(String.fromCodePoint(codepoint));
  if (!index) return undefined;

  const glyph = parsed.glyphs.get(index);
  if (!glyph?.advanceWidth) return undefined;

  const em = parsed.unitsPerEm;
  return {
    // getPath already flips y into screen space, so toPathData must not flip it again.
    pathData: glyph.getPath(0, em * BASELINE, em).toPathData({ decimalPlaces: 2, flipY: false }),
    width: glyph.advanceWidth,
    height: em,
  };
}
