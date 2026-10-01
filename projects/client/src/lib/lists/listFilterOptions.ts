import { fadeHideOptions } from '../components/filters/fadeHide.ts';

const notes = [{ id: 'notes', label: 'Notes' }, { id: 'nonotes', label: 'No Notes' }] as const;
const release = [
  { id: 'released', label: 'Released' },
  { id: 'unreleased', label: 'Not Released' },
  { id: 'noreleasedate', label: 'No Release Date' },
  { id: 'ended', label: 'Ended / Canceled' },
  { id: 'airing', label: 'Currently Airing' },
] as const;

/** ListShowable's eye menu: partial show state, list notes, release and airing state, and owner exclusions. */
export function listFilterOptions({ kind, types, isSelf }: {
  kind: string;
  types: readonly string[];
  isSelf: boolean;
}) {
  const partial = kind !== 'official' &&
    (types.length === 0 || types.some((type) => ['show', 'season'].includes(type)));
  const state = fadeHideOptions.filter((option) => {
    if ('showsOnly' in option && !partial) return false;
    if (isSelf && kind === 'watchlist' && ['watchlisted', 'unwatchlisted'].includes(option.id)) return false;
    return !(isSelf && kind === 'personal' && ['listed', 'unlisted'].includes(option.id));
  });
  return { fade: [...state, ...notes], hide: [...state, ...release, ...notes] };
}
