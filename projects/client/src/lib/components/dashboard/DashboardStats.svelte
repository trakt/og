<script lang="ts">
import type { UserStatsResponse } from '@trakt/api';
import Container from '$lib/components/container/Container.svelte';
import Icon from '$lib/icons/Icon.svelte';
import television from '$lib/icons/thin/tv-retro.svg?raw';
import movie from '$lib/icons/thin/camera-movie.svg?raw';
import collection from '$lib/icons/trakt/collection.svg?raw';
import { formatRuntime } from '$lib/utils/formatRuntime';

const { stats, slug, collected, covered = false }: {
  stats: Pick<UserStatsResponse, 'episodes' | 'shows' | 'movies'>;
  slug: string;
  collected: { episodes: number | undefined; shows: number | undefined; movies: number | undefined };
  covered?: boolean;
} = $props();
const library = $derived({
  ...collected,
  shows: collected.shows ?? stats.shows.collected,
  movies: collected.movies ?? stats.movies.collected,
});
const visible = $derived(
  [stats.episodes.minutes, stats.movies.minutes, library.episodes ?? 0, library.movies].some((n) => n > 0),
);
const count = (n: number) => n.toLocaleString('en-US');
const plural = (n: number | undefined, word: string) => n === 1 ? word : `${word}s`;
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#if visible}
  <div class={['strip', { covered }]} aria-label="Your watching and library statistics">
  <Container>
    <div class="columns">
      <div class="stat">
        <a class="stat-icon" href="/users/{slug}/history/episodes"
          aria-label="Episode history"><Icon svg={television} fixedWidth /></a>
        <div>
            <a href="/users/{slug}/history/episodes"><strong>{formatRuntime(stats.episodes.minutes)}</strong> watched</a><br />
            <a href="/users/{slug}/history/episodes"><strong>{count(stats.episodes.watched)}</strong> {plural(stats.episodes.watched, 'episode')}</a>
            (<a href="/users/{slug}/history/episodes"><strong>{count(stats.episodes.plays)}</strong> {plural(stats.episodes.plays, 'play')}</a><a class="show-count" href="/users/{slug}/history/shows">&nbsp;of <strong>{count(stats.shows.watched)}</strong> {plural(stats.shows.watched, 'show')}</a>)
          </div>
      </div>
      <div class="stat">
        <a class="stat-icon" href="/users/{slug}/history/movies"
          aria-label="Movie history"><Icon svg={movie} fixedWidth /></a>
        <a
          href="/users/{slug}/history/movies"><strong>{formatRuntime(stats.movies.minutes)}</strong> watched<br /><strong>{count(stats.movies.watched)}</strong> {plural(stats.movies.watched, 'movie')} (<strong>{count(stats.movies.plays)}</strong> {plural(stats.movies.plays, 'play')})</a>
      </div>
      <div class="stat">
        <a class="stat-icon collection" href="/users/{slug}/library"
          aria-label="Your library"><Icon svg={collection} fixedWidth /></a>
        <div>
            <a href="/users/{slug}/library/episodes"><strong aria-label={library.episodes === undefined ? 'Loading collected episodes' : undefined}>{library.episodes === undefined ? '…' : count(library.episodes)}</strong> {plural(library.episodes, 'episode')}</a>
            <a class="show-count" href="/users/{slug}/library/shows"> (<strong>{count(library.shows)}</strong> {plural(library.shows, 'show')})</a> in library<br />
            <a href="/users/{slug}/library/movies"><strong>{count(library.movies)}</strong> {plural(library.movies, 'movie')} in library</a>
          </div>
      </div>
    </div>
  </Container>
</div>
{/if}

<style>
.strip {
  background: var(--color-dashboard-stats-bg);
  color: var(--color-text-inverse);
  animation: stats-appear var(--transition-relationship-request);
  &.covered {
    background: var(--color-profile-tabs-bg);
  }
}

@keyframes stats-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--gutter);
  padding-block: var(--space-lg-block);
}
.stat {
  display: flex;
  align-items: start;
  gap: var(--space-sm-inline);
  strong {
    line-height: 1;
  }
}
a {
  color: inherit;
  transition: color var(--transition-relationship-request);
  &:is(:hover, :focus-visible) {
    color: var(--brand-primary);
    text-decoration: none;
  }
}
.stat-icon {
  flex-shrink: 0;
  margin-block-start: var(--dashboard-stat-icon-top);
  font-size: var(--font-size-dashboard-stat-icon);
  line-height: 1;
}
.collection {
  font-size: var(--font-size-dashboard-library-icon);
}
@media (768px <= width < 992px) {
  .show-count {
    display: none;
  }
}
@media (width < 768px) {
  .columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
