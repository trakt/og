import { extractGlyph } from './extractGlyph.ts';
import { findCodepoint } from './findCodepoint.ts';
import { glyphToSvg } from './glyphToSvg.ts';
import { iconFamilies } from './iconFamilies.ts';
import type { IconFamily } from './IconFamily.ts';

interface ExtractIconParams {
  readonly family: IconFamily;
  readonly name: string;
  /** Reads a file by its path relative to the root. */
  readonly readText: (path: string) => Promise<string>;
  readonly readBytes: (path: string) => Promise<ArrayBuffer>;
}

interface ExtractedIcon {
  /** The canonical name, which differs from the requested one when it was an alias. */
  readonly name: string;
  readonly svg: string;
}

export async function extractIcon({ family, name, readText, readBytes }: ExtractIconParams): Promise<ExtractedIcon> {
  const { font, stylesheet, lookup } = iconFamilies[family];

  const match = findCodepoint({ lookup, name, stylesheet: await readText(stylesheet) });
  if (!match) throw new Error(`No ${family} icon named "${name}" in assets/${stylesheet}.`);

  const glyph = extractGlyph({ font: await readBytes(font), codepoint: match.codepoint });
  if (!glyph) throw new Error(`"${match.name}" has no glyph in assets/${font}. Is it in a different family?`);

  return { name: match.name, svg: glyphToSvg(glyph) };
}
