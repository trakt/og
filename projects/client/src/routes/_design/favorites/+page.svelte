<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import ActionButtons from '$lib/components/summary/ActionButtons.svelte';
import type { FavoriteTarget } from '$lib/favorites/FavoriteTarget';

const movie: FavoriteTarget = { type: 'movie', id: 432, title: 'Fight Club', year: 1999 };
const show: FavoriteTarget = { type: 'show', id: 1388, title: 'Breaking Bad', year: 2008 };
</script>

<svelte:head>
  <title>Favorites - Design System - Trakt</title>
</svelte:head>
<Container>
  <section class="demo">
    <h1>Favorites</h1>
    <p>The summary and poster controls share favorite state. Season and episode stars favorite their parent show.</p>
    <ActionButtons checkin={{ type: 'movie', id: movie.id }} favorites favoriteTarget={movie} />
    <PosterGrid columns={3}>
      <PosterCard href="/movies/fight-club-1999" title="Fight Club"
        icons={{ fill: quickIconFill({ state: {} }), favorite: true, favoriteTarget: movie }} />
      <PosterCard href="/shows/breaking-bad/seasons/1" title="Season 1"
        icons={{ fill: quickIconFill({ state: {} }), favorite: true, favoriteTarget: show, listLabel: 'Add to list' }} />
      <PosterCard href="/shows/breaking-bad/seasons/1/episodes/1" title="Pilot" variant="screenshot"
        icons={{ fill: quickIconFill({ state: {} }), favorite: true, favoriteTarget: show, listLabel: 'Add to list' }} />
    </PosterGrid>
  </section>
</Container>

<style>
.demo {
  padding-block: calc(var(--header-height) + var(--gutter)) var(--gutter);
}
</style>
