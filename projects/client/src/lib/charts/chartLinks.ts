import type { ChartPeriod } from './chartPeriod.ts';
import type { MediaType } from './loadChart.ts';

type ChartLinksParams = {
  type: MediaType;
  /** The current chart's first path segment after the type: `trending`, `favorited`. */
  current: string;
  /** The period chart links keep: the current one, or weekly on a chart without one. */
  period: ChartPeriod;
  search: URLSearchParams;
  signedIn: boolean;
};

/**
 * The "Trakt" chart nav. Links keep the filters in the query string but drop
 * `page` and `cursor`. Streaming Charts is cut (the endpoint is retired) and Played has no link, like OG.
 */
export function chartLinks({ type, current, period, search, signedIn }: ChartLinksParams) {
  const params = new URLSearchParams(search);
  params.delete('page');
  params.delete('cursor');
  const query = params.size > 0 ? `?${params}` : '';

  const link = (label: string, path: string, keepQuery = true) => ({
    label,
    href: `/${type}/${path}${keepQuery ? query : ''}`,
    current: path.split('/').at(0) === current,
  });

  return [
    link('Trending', 'trending'),
    ...(signedIn ? [link('Recommendations', 'recommendations')] : []),
    link('Anticipated', 'anticipated'),
    link('Popular', 'popular'),
    link('Favorited', `favorited/${period}`),
    link('Watched', `watched/${period}`),
    link('Libraries', `library/${period}`),
    ...(type === 'movies' ? [link('Box Office', 'boxoffice', false)] : []),
  ];
}
