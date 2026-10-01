import type { MovieResponse } from '@trakt/api';
import type { ExternalLink } from '../components/summary/ExternalLink.ts';
import { iconLinks } from '../components/summary/iconLinks.ts';
import type { StreamingRank } from '../components/summary/toExternalRatings.ts';

export function toMovieLinks({ movie, rank }: { movie: MovieResponse; rank: StreamingRank | null }): ExternalLink[] {
  const { ids, homepage } = movie;
  const links: (ExternalLink | false)[] = [
    !!homepage && { label: 'Official Site', href: homepage },
    {
      label: 'IMDB',
      href: ids.imdb
        ? `https://www.imdb.com/title/${ids.imdb}`
        : `https://www.imdb.com/find?${new URLSearchParams({ q: movie.title, s: 'tt' })}`,
    },
    !!ids.tmdb && { label: 'TMDB', href: `https://www.themoviedb.org/movie/${ids.tmdb}` },
    !!ids.tmdb && { label: 'Fanart.tv', href: `https://fanart.tv/movie/${ids.tmdb}` },
  ];
  return [
    ...links.filter((link) => link !== false),
    ...iconLinks({
      social: movie.social_ids,
      justwatch: rank?.link,
      search: `${movie.year ? `${movie.title} ${movie.year}` : movie.title} Movie`,
    }),
  ];
}
