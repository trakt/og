<script lang="ts">
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import { type FadeHide, fadeHideOptions } from '$lib/components/filters/fadeHide';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import ActionButtons from '$lib/components/summary/ActionButtons.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import NoResults from '$lib/components/empty/NoResults.svelte';
import LoadingBar from '$lib/components/loading/LoadingBar.svelte';
import LoadingOverlay from '$lib/components/loading/LoadingOverlay.svelte';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import RatingPopover from '$lib/components/rating/RatingPopover.svelte';
import FilterMenu from '$lib/components/filters/FilterMenu.svelte';
import TermsFilter from '$lib/components/filters/TermsFilter.svelte';
import AdvancedFiltersToggle from '$lib/components/filters/AdvancedFiltersToggle.svelte';
import MultiSelect from '$lib/components/filters/MultiSelect.svelte';
import RangeSlider from '$lib/components/filters/RangeSlider.svelte';
import { filterRanges } from '$lib/components/filters/filterRanges';
import PillTabs from '$lib/components/tabs/PillTabs.svelte';

let filters = $state<FadeHide>({ fade: [], hide: [] });
let current = $state(1);
let total = $state(2);
const href = (n: number) => `?page=${n}`;

const tabs = [
  { id: 'likes-30', label: 'Likes 30 Days' },
  { id: 'likes-all', label: 'Likes All Time' },
  { id: 'recent', label: 'Recent', count: 12 },
  { id: 'me', label: 'Me' },
];
let tab = $state('likes-30');

let terms = $state('');
let movies = $state(true);

let rating = $state<number | null>(9);

let funnelOpen = $state(false);
const genreOptions = ['Action', 'Comedy', 'Drama', 'Science Fiction', 'Thriller'].map((label) => ({
  value: label.toLowerCase().replace(' ', '-'),
  label,
}));
let genres = $state<readonly string[]>(['drama']);
const scales = filterRanges({ now: new Date() });
let years = $state<readonly [number, number]>([1990, 2010]);
let imdb = $state<readonly [number, number]>([7, 10]);

let overlay = $state(false);
let bar = $state(false);
function showOverlay() {
  overlay = true;
  setTimeout(() => (overlay = false), 2000);
}

let theme = $state('light');
$effect(() => {
  document.documentElement.dataset.theme = theme;
  return () => delete document.documentElement.dataset.theme;
});
</script>

<svelte:head>
  <title>Controls · og design system</title>
</svelte:head>

<main>
  <section>
    <div class="container">
      <h1>Controls</h1>
      <label>
        Theme
        <select bind:value={theme}>
          <option value="light">Light (OG default)</option>
          <option value="dark">Dark (dark knight)</option>
        </select>
      </label>

      <h2>Media fade and hide</h2>
      <div class="block media-filters">
        <FadeHideMenu value={filters} options={fadeHideOptions} cookie="design-media" variant="default"
          onchange={(next) => (filters = next)} />
        <PosterCard title="Season 1" href="/shows/breaking-bad/seasons/1" faded={filters.fade.includes('watched')}
          subtitles={['7 episodes']} />
        <ActionButtons history={false} library={false} comment={false}
          progress={{ watched: 1, collected: 0, visible: 3, total: 3 }} />
      </div>
      <h2>Pagination</h2>
      <div class="knobs">
        <label>Page <input type="number" min="1" max={total} bind:value={current} /></label>
        <label>Pages <input type="number" min="1" bind:value={total} /></label>
      </div>
      <div class="block" id="pagination">
        <Pagination meta={{ current, total }} {href} />
      </div>

      <h2>Pill tabs</h2>
      <div class="block" id="tabs">
        <PillTabs label="Comments" {tabs} bind:selected={tab}>
          {#snippet panel(id)}<p class="panel">Panel for <code>{id}</code></p>{/snippet}
        </PillTabs>
      </div>

      <h2>Filter controls</h2>
      <div class="block" id="sortable">
        <TermsFilter bind:terms vip />
        <TermsFilter bind:terms vip={false} />
        <FilterMenu active={!movies || terms !== ''} count={movies ? 0 : 1}>
          <ul>
            <li><button type="button" onclick={() => ((movies = true), (terms = ''))}>Show All</button></li>
          </ul>
          <hr />
          <ul>
            <li class="header" role="presentation">Types</li>
            <li><button type="button" aria-pressed={movies} onclick={() => (movies = !movies)}>Movies</button></li>
          </ul>
        </FilterMenu>
        <p>{terms ? `"${terms}"` : 'no terms'}{movies ? '' : ', no movies'}</p>
      </div>

      <h2>Advanced filter controls</h2>
      <div class="block frame advanced" id="advanced">
        <AdvancedFiltersToggle bind:open={funnelOpen} controls="advanced" active={genres.length > 0}
          count={genres.length} />
        <MultiSelect bind:value={genres} options={[{ options: genreOptions }]} label="Genres"
          placeholder="Choose genres..." />
        <p>Released in {years[0]} to {years[1]}</p>
        <RangeSlider bind:value={years} scale={scales.years} label="Released" />
        <p>IMDb</p>
        <RangeSlider labeled bind:value={imdb} scale={scales.imdb_ratings} label="IMDb rating"
          format={(v) => v.toFixed(1)} />
      </div>

      <h2>Rating hearts</h2>
      <div id="rating">
        <RatingPopover label="Rate the demo item" value={rating} onrate={(n) => (rating = n)}>
          {#snippet trigger()}<span>Rate this item: {rating ?? 'unrated'}</span>{/snippet}
        </RatingPopover>
        <p>Arrow keys preview a heart; Enter or Space saves it. Choosing the current rating removes it.</p>
      </div>

      <h2>Empty states</h2>
      <div class="block" id="no-data">
        <NoData />
      </div>
      <div class="frame" id="no-results">
        <NoResults />
      </div>

      <h2>Loading states</h2>
      <div class="knobs">
        <button type="button" onclick={showOverlay}>Show the page loader for 2s</button>
        <label><input type="checkbox" bind:checked={bar} /> Loading bar</label>
      </div>
    </div>
  </section>
</main>

<LoadingOverlay visible={overlay} />
<LoadingBar visible={bar} />

<style>
.media-filters {
  max-inline-size: var(--dropdown-min-width);
}

section {
  padding-block: var(--gutter) calc(var(--gutter) * 2);
}

.container {
  max-inline-size: var(--container-lg);
  margin-inline: auto;
  padding-inline: calc(var(--gutter) / 2);
}

.knobs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gutter);
  align-items: center;
  margin-block-end: var(--gutter);
}

.block {
  margin-block-end: var(--gutter);
}

.panel {
  margin-block-start: var(--space-lg-block);
}

.frame {
  background-color: var(--color-frame);
}

.advanced {
  display: grid;
  gap: var(--space-lg-block);
  max-inline-size: var(--sidenav-width);
  padding: var(--gutter);
  color: var(--color-frame-text);
}
</style>
