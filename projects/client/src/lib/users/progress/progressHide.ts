import type { ProgressType } from './progressTypes.ts';

/** OG's HIDE toggles under the progress eye, each a worker query param. */
export const progressHideOptions = [
  { id: 'completed', label: 'Completed', param: 'hide_completed' },
  { id: 'not-completed', label: 'Not Completed', param: 'hide_not_completed' },
  { id: 'ended', label: 'Ended / Canceled', param: 'hide_ended' },
  { id: 'airing', label: 'Currently Airing', param: 'hide_airing' },
  { id: 'rewatching', label: 'Rewatching', param: 'hide_rewatching' },
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

/** The worker's `hide_*` params for the applied toggles. */
export function progressHideParams(hide: readonly ProgressHide[]): Record<string, string> {
  return Object.fromEntries(
    progressHideOptions.filter(({ id }) => hide.includes(id)).map(({ param }) => [param, 'true']),
  );
}
