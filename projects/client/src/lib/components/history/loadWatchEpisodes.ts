import { api } from '../../api/api.ts';
import type { WatchTarget } from './WatchTarget.ts';
import type { WatchEpisode } from './WatchEpisode.ts';

/** Progress supplies only aired episode numbers. Public season summaries supply their overlay ids. */
export async function loadWatchEpisodes(
  { target, fetch, progress = 'watched' }: {
    target: WatchTarget;
    fetch: typeof globalThis.fetch;
    progress?: 'watched' | 'collection';
  },
): Promise<WatchEpisode[]> {
  const show = target.type === 'show' ? target.id : target.season?.show;
  if (show === undefined) throw new Error('Season context unavailable');
  const response = await api({ fetch }).shows.progress[progress]({
    params: { id: String(show) },
    query: { hidden: true, specials: target.season?.number === 0 },
  });
  if (response.status !== 200) throw new Error(String(response.status));
  const seasons = response.body.seasons.filter(({ number }) =>
    target.type === 'season' ? number === target.season?.number : number > 0
  );
  return (await Promise.all(seasons.map(async (season) => {
    // The public season summary, without the viewer's token.
    const details = await api().shows.season.episodes({
      params: { id: String(show), season: season.number },
      query: {},
    });
    if (details.status !== 200) throw new Error(String(details.status));
    return season.episodes.map((episode) => {
      const id = details.body.find(({ number }) => number === episode.number)?.ids.trakt;
      if (id === undefined) throw new Error('Episode not found');
      return { id, show, season: season.number, number: episode.number, completed: episode.completed };
    });
  }))).flat();
}
