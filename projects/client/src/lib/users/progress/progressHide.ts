import type { ProgressType } from './progressTypes.ts';

/** OG's HIDE toggles under the progress eye (`filterProgress` applies them). */
export const progressHideOptions = [
  { id: 'completed', label: 'Completed' },
  { id: 'not-completed', label: 'Not Completed' },
  { id: 'ended', label: 'Ended / Canceled' },
  { id: 'airing', label: 'Currently Airing' },
  { id: 'rewatching', label: 'Rewatching' },
] as const;

export type ProgressHide = (typeof progressHideOptions)[number]['id'];

/** Rewatching is a watched-only filter. */
export const hideOptionsFor = (type: ProgressType) =>
  progressHideOptions.filter(({ id }) => type === 'watched' || id !== 'rewatching');

const ids: ReadonlySet<string> = new Set(progressHideOptions.map(({ id }) => id));
const isProgressHide = (value: string): value is ProgressHide => ids.has(value);

type ReadProgressHideParams = {
  /** The `filter-hide-progress` cookie, a comma list. */
  cookie?: string;
  /** OG's `?hide_completed=true`, which the dashboard's Up Next link sends. */
  search: URLSearchParams;
  type: ProgressType;
};

/** The applied hide toggles: the saved cookie, plus Completed while the URL asks for it. */
export function readProgressHide({ cookie, search, type }: ReadProgressHideParams): ProgressHide[] {
  const saved = (cookie ?? '').split(',').filter(isProgressHide);
  const fromUrl: ProgressHide[] = search.get('hide_completed') === 'true' ? ['completed'] : [];
  const allowed = new Set<string>(hideOptionsFor(type).map(({ id }) => id));

  return [...new Set([...saved, ...fromUrl])].filter((id) => allowed.has(id));
}
