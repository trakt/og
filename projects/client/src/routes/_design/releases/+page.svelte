<script lang="ts">
import MovieReleasesPage from '$lib/movies/MovieReleasesPage.svelte';
import { toMovieReleases } from '$lib/movies/toMovieReleases';

const data = {
  watchNow: {
    path: '/movies/fight-club-1999',
    tiles: [],
    count: 0,
    favorites: 0,
    cinemaOnly: false,
    hidden: false,
    country: 'us',
    favoriteKeys: [],
  },
  movie: {
    id: 1,
    updatedAt: null,
    title: 'Fight Club',
    year: 1999,
    href: '/movies/fight-club-1999',
    fullTitle: 'Fight Club (1999)',
    overview: 'Release panel design demo.',
    poster: undefined,
    fanart: undefined,
    links: [],
  },
  countries: toMovieReleases({
    originalCountry: 'us',
    datePreferences: { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
    releases: [
      { country: 'gb', release_date: '1999-11-06', release_type: 'theatrical', certification: 'R' },
      {
        country: 'us',
        release_date: '1999-10-15',
        release_type: 'limited',
        certification: 'R',
        note: 'Limited engagement',
      },
      { country: 'us', release_date: '2000-06-06', release_type: 'physical', note: 'DVD' },
    ],
  }),
};
</script>

<MovieReleasesPage {data} />
