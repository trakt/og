import type { iconFamilies } from './iconFamilies.ts';
import type { IconFamily } from './IconFamily.ts';

type IconLookup = (typeof iconFamilies)[IconFamily]['lookup'];

interface NamedCodepoint {
  readonly name: string;
  readonly codepoint: number;
}

interface FindCodepointParams {
  readonly lookup: IconLookup;
  readonly name: string;
  readonly stylesheet: string;
}

const toEntry = ([, name = '', hex = '']: RegExpMatchArray): NamedCodepoint => ({
  name,
  codepoint: parseInt(hex, 16),
});

// `$fa-var-xmark: \f00d;`, with aliases (`$fa-var-times: \f00d;`) listed right after the canonical name.
const faEntries = (scss: string) => [...scss.matchAll(/^\$fa-var-([a-z0-9-]+):\s*\\([0-9a-f]+);/gm)].map(toEntry);

// `$fa-custom-icons: ( justwatch: "\e00a", ... );`
const kitEntries = (scss: string) => {
  const block = scss.split('$fa-custom-icons:').at(1)?.split(');').at(0) ?? '';
  return [...block.matchAll(/^\s*([a-z0-9-]+):\s*"\\([0-9a-f]+)"/gm)].map(toEntry);
};

// `.trakt-icon-check:before { content: "\e601"; }`
const iconFontEntries = (css: string, prefix: string) =>
  [...css.matchAll(new RegExp(`\\.${prefix}-icon-([a-z0-9_-]+):before\\s*\\{\\s*content:\\s*"\\\\([0-9a-f]+)"`, 'g'))]
    .map(toEntry);

const entriesFor = ({ lookup, stylesheet }: Omit<FindCodepointParams, 'name'>) => {
  if (lookup === 'fa') return faEntries(stylesheet);
  if (lookup === 'kit') return kitEntries(stylesheet);
  return iconFontEntries(stylesheet, lookup);
};

/**
 * Finds a name's codepoint in the stylesheet that defines it.
 * Aliases resolve to the canonical name, which is the first name with the same codepoint.
 */
export function findCodepoint({ lookup, name, stylesheet }: FindCodepointParams): NamedCodepoint | undefined {
  const entries = entriesFor({ lookup, stylesheet });
  const match = entries.find((entry) => entry.name === name);
  if (!match) return undefined;

  return entries.find((entry) => entry.codepoint === match.codepoint);
}
