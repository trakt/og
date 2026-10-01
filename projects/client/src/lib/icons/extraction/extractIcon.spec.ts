import { Font, Glyph, Path } from 'opentype.js/dist/opentype.mjs';
import { describe, expect, it } from 'vitest';
import { extractIcon } from './extractIcon.ts';
import type { IconFamily } from './IconFamily.ts';

const FA_VARIABLES = `
$fa-var-xmark: \\f00d;
$fa-var-times: \\f00d;
$fa-var-gear: \\f013;
$fa-custom-icons: (
  justwatch: "\\e00a",
);
`;

const ICON_FONTS = `
.trakt-icon-check:before { content: "\\e601"; }
.logos-icon-dts_x:before { content: "\\e60e"; }
`;

const STYLESHEETS: Record<string, string> = {
  'stylesheets/fontawesome/variables.scss': FA_VARIABLES,
  'stylesheets/icon-fonts.scss': ICON_FONTS,
};

// A 256 x 448 box sitting on the baseline, in font units (y up).
const box = () => {
  const path = new Path();
  path.moveTo(0, 0);
  path.lineTo(256, 0);
  path.lineTo(256, 448);
  path.lineTo(0, 448);
  path.close();
  return path;
};

// Every fixture codepoint gets the box, except gear (f013), which the font leaves out.
// The ascender and descender don't add up to the em on purpose, like Font Awesome's.
const fixtureFont = () =>
  new Font({
    familyName: 'Fixture',
    styleName: 'Regular',
    unitsPerEm: 512,
    ascender: 460,
    descender: -75,
    glyphs: [
      new Glyph({ name: '.notdef', advanceWidth: 512, path: new Path() }),
      ...[0xf00d, 0xe00a, 0xe601, 0xe60e].map((unicode) =>
        new Glyph({ name: `u${unicode.toString(16)}`, unicode, advanceWidth: 320, path: box() })
      ),
    ],
  }).toArrayBuffer();

const extract = (family: IconFamily, name: string) => {
  const reads: string[] = [];
  const font = fixtureFont();
  const result = extractIcon({
    family,
    name,
    readText: (path) => {
      reads.push(path);
      return Promise.resolve(STYLESHEETS[path] ?? '');
    },
    readBytes: (path) => {
      reads.push(path);
      return Promise.resolve(font);
    },
  });
  return { result, reads };
};

describe('extractIcon', () => {
  it('should write one currentColor path in a 1em box as wide as the glyph', async () => {
    const { svg } = await extract('thin', 'xmark').result;

    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 320 512"><path fill="currentColor" d="[^"]+"\/><\/svg>\n$/,
    );
  });

  it('should put the baseline 7/8 of the way down, whatever the font metrics', async () => {
    const { svg } = await extract('thin', 'xmark').result;

    // The box's bottom edge (font y = 0) lands on y = 448, and its top (font y = 448) on y = 0.
    // opentype.js leaves contours open, which fills the same as closing them.
    expect(svg).toContain('d="M0 448L256 448L256 0L0 0"');
  });

  it('should save an alias under its canonical name', async () => {
    const { name } = await extract('solid', 'times').result;

    expect(name).toBe('xmark');
  });

  describe('source files', () => {
    const cases: ReadonlyArray<[IconFamily, string, string, string]> = [
      ['solid', 'xmark', 'fontawesome/variables.scss', 'fa-solid-900.ttf'],
      ['regular', 'xmark', 'fontawesome/variables.scss', 'fa-regular-400.ttf'],
      ['light', 'xmark', 'fontawesome/variables.scss', 'fa-light-300.ttf'],
      ['thin', 'xmark', 'fontawesome/variables.scss', 'fa-thin-100.ttf'],
      ['brands', 'xmark', 'fontawesome/variables.scss', 'fa-brands-400.ttf'],
      ['kit', 'justwatch', 'fontawesome/variables.scss', 'custom-icons.ttf'],
      ['trakt', 'check', 'icon-fonts.scss', 'trakt.ttf'],
      ['logos', 'dts_x', 'icon-fonts.scss', 'logos.ttf'],
    ];

    it.each(cases)('should read %s icons from its stylesheet and font', async (family, name, stylesheet, font) => {
      const { result, reads } = extract(family, name);
      await result;

      expect(reads).toEqual([`stylesheets/${stylesheet}`, `fonts/${font}`]);
    });
  });

  describe('errors', () => {
    it('should name the family and stylesheet when the name is unknown', async () => {
      await expect(extract('thin', 'not-an-icon').result).rejects.toThrow(
        'No thin icon named "not-an-icon" in assets/stylesheets/fontawesome/variables.scss.',
      );
    });

    it("should say when the family's font has no glyph for the name", async () => {
      await expect(extract('brands', 'gear').result).rejects.toThrow(
        '"gear" has no glyph in assets/fonts/fa-brands-400.ttf.',
      );
    });
  });
});
