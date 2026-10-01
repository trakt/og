import table from './emojiShortnames.txt?raw';

// Fitzpatrick modifiers for JoyPixels' `_tone1` to `_tone5` names.
const TONES = ['1f3fb', '1f3fc', '1f3fd', '1f3fe', '1f3ff'];

let shortnames: ReadonlyMap<string, string> | undefined;

const toEmoji = (codepoints: string) =>
  String.fromCodePoint(...codepoints.split('-').map((hex) => Number.parseInt(hex, 16)));

const load = () =>
  new Map(
    table.split('\n').filter(Boolean).map((line) => {
      const [name = '', codepoints = ''] = line.split(' ');
      return [name, codepoints];
    }),
  );

/**
 * The Unicode emoji for a JoyPixels shortname without its colons (`joy`, `thumbsup_tone2`), or `undefined` when there's
 * none. OG drew these as JoyPixels images; og uses the system's emoji font.
 */
export function emojiFor(name: string): string | undefined {
  shortnames ??= load();

  const codepoints = shortnames.get(name);
  if (codepoints) return toEmoji(codepoints);

  const toned = /^(.+)_tone([1-5])$/.exec(name);
  const base = toned?.[1] && shortnames.get(toned[1]);
  const tone = TONES.at(Number(toned?.[2]) - 1);
  // A modifier only goes after a single-codepoint emoji. ZWJ sequences with tones stay as text.
  if (!base || !tone || base.replace(/-fe0f$/, '').includes('-')) return undefined;

  return toEmoji(`${base.replace(/-fe0f$/, '')}-${tone}`);
}
