import { loadMovieReleases } from '../../../../lib/movies/loadMovieReleases.ts';

export const load = ({ fetch, parent, params }) => loadMovieReleases({ fetch, parent, id: params.id });
