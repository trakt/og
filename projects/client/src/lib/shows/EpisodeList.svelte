<!--
  A show's episode list (OG's `#seasons-episodes-sortable` of `.row.fanarts`): "N Episodes" with the sort dropdown,
  then a row per episode. The fanart card with quick icons sits on the left; on the right the type tag, "1x02 Title",
  the air date and runtime, the comment count and the overview.
-->
<script lang="ts">
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import { type FadeHide, fadeHideOptions, matchesFadeHide } from '$lib/components/filters/fadeHide';
import { replaceState } from '$app/navigation';
import { page } from '$app/state';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import TermsFilter from '$lib/components/filters/TermsFilter.svelte';
import Overview from '$lib/components/summary/Overview.svelte';
import FanartCard from '$lib/components/media/FanartCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import SortHeading from '$lib/components/summary/SortHeading.svelte';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import ItemStatIcons from '$lib/components/media/ItemStatIcons.svelte';
import { lazyItemStats } from '$lib/shows/lazyItemStats.svelte';
import { EPISODE_SORTS, type EpisodeRow, type EpisodeSort, sortEpisodes } from './toShowEpisodes.ts';

interface Props {
  rows: readonly EpisodeRow[];
  showId: number;
  signedIn?: boolean;
  initialFilters?: FadeHide;
  datePreferences: DatePreferences;
  season?: boolean;
  search?: boolean;
  vip?: boolean;
  initialTerms?: string;
  initialSort?: string;
}

const {
  rows,
  showId,
  signedIn = false,
  initialFilters = { fade: [], hide: [] },
  datePreferences,
  season = false,
  search = false,
  vip = false,
  initialTerms = '',
  initialSort = 'aired,asc',
}: Props = $props();

const sorts = $derived(season ? EPISODE_SORTS.filter(({ by }) => by !== 'aired') : EPISODE_SORTS);
const initial = () => sorts.find(({ by }) => by === initialSort.split(',').at(0));
const startBy = () => initial()?.by ?? (season ? 'number' : 'aired');
const startFlipped = () => initial() ? initial()?.desc !== (initialSort.split(',').at(1) === 'desc') : false;
const startTerms = () => initialTerms;
// Props are initial values; the page keys this component on the item and URL query.
let by = $state<EpisodeSort>(startBy());
let flipped = $state(startFlipped());
let terms = $state(startTerms());
let filters = $derived(initialFilters);
const options = fadeHideOptions.filter((option) => !('showsOnly' in option));
const view = (row: EpisodeRow) => {
  const state = overlay.state('episode', row.id, { show: showId, number: row.season, episode: row.episode });
  const fill = quickIconFill({ state, datePreferences });
  const matches = (id: (typeof options)[number]['id']) => matchesFadeHide(id, state, fill);
  return { state, fill, hidden: signedIn && filters.hide.some(matches), faded: signedIn && filters.fade.some(matches) };
};
const filtered = $derived(
  rows.filter(({ title }) => title.toLocaleLowerCase().includes(terms.trim().toLocaleLowerCase()))
    .filter((row) => !view(row).hidden),
);
const stats = lazyItemStats({
  items: () => filtered.map((row) => ({ id: row.id, show: showId, season: row.season, episode: row.episode })),
  sort: () => by,
  fallback: () => season ? 'number' : 'aired',
});
const sorted = $derived(sortEpisodes({ rows: filtered, by: stats.by, flipped, stats: stats.counts }));

function saveFilters(next: FadeHide) {
  filters = next;
  const params = new SvelteURLSearchParams(page.url.search);
  for (const section of ['fade', 'hide'] as const) {
    if (filters[section].length) params.set(section, filters[section].join(','));
    else params.delete(section);
  }
  if (terms.trim()) params.set('terms', terms.trim());
  else params.delete('terms');
  const natural = sorts.find((sort) => sort.by === by)?.desc ?? false;
  params.set('sort', `${by},${natural !== flipped ? 'desc' : 'asc'}`);
  const search = params.toString().replaceAll('%2C', ',');
  if (`?${search}` === page.url.search) return;
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- only this page's query changes
  replaceState(`${page.url.pathname}?${search}${page.url.hash}`, page.state);
}
</script>

<!-- Hrefs are built from API slugs, and resolve() only takes literal routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#if rows.length > 0}
  <section class="episodes" aria-labelledby="episodes">
    <SortHeading id="episodes" count={filtered.length} noun="Episode" {sorts} bind:by bind:flipped loading={stats.loading}>
      {#snippet controls()}{#if search}<TermsFilter bind:terms {vip} />{/if}{#if signedIn}<FadeHideMenu value={filters} {options} cookie="season" variant="default" onchange={saveFilters} />{/if}{/snippet}
    </SortHeading>
    {#if filtered.length === 0}<p role="status">No episodes match your filters.</p>{/if}
    {#each sorted as row (row.id)}
      {@const item = view(row)}
      {@const state = item.state}
      <article class={["row", { faded: item.faded }]} aria-labelledby="episode-{row.id}" {@attach stats.observe({ id: row.id, show: showId, season: row.season, episode: row.episode })}>
        <FanartCard
          href={row.href}
          title={row.title}
          number={row.number}
          image={row.image}
          spoilerImage={row.spoilerImage}
          titles={false}
          userRating={state.rating}
          icons={{
            fill: item.fill,
            ratingTarget: { type: 'episode', id: row.id, title: row.title },
            collectionTarget: { type: 'episode', id: row.id, title: row.title, season: { show: showId, number: row.season, episode: row.episode } },
            rating: row.rating,
            released: row.released,
            listLabel: 'Add to list',
            watchNow: 'play',
          }}
        />
        <div class="info">
          <div class="titles">
            {#if row.type}
              <p class="type" style:--episode-color="var(--episode-{row.type.kind})">{row.type.text}</p>
            {/if}
            <h3 id="episode-{row.id}"><a href={row.href}><span class="number">{row.number}</span></a> <MediaSpoiler target={{type:"episode",id:row.id}} kind="title" inline><a href={row.href}>{row.title}</a></MediaSpoiler></h3>
            <p class="meta">
              {#if row.aired}{row.aired}{:else}<span class="unknown">no air date</span>{/if}
              {#if row.runtime}<span class="unknown">&mdash; {row.runtime}</span>{/if}
            </p>
            <div class="stats">
              <ItemStatIcons href={row.href} stats={stats.counts.get(row.id)} comments={row.comments} />
            </div>
          </div>
          {#if row.overview}<div class="overview"><MediaSpoiler target={{type:"episode",id:row.id}} kind="overview"><Overview overview={row.overview} compact /></MediaSpoiler></div>{/if}
        </div>
      </article>
    {/each}
  </section>
{/if}

<style>
/* OG's col-md-4 / col-md-8 (col-sm-5 / col-sm-7), stacked on phones. */
.row {
  transition: opacity var(--transition-card);
  &.faded:not(:hover, :focus-within) {
    opacity: var(--opacity-faded);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  display: grid;
  grid-template-columns: calc((100% + var(--gutter)) * 4 / 12 - var(--gutter)) minmax(0, 1fr);
  column-gap: var(--gutter);
  align-items: start;
  margin-block-start: var(--gutter);

  @media (width < 992px) {
    grid-template-columns: calc((100% + var(--gutter)) * 5 / 12 - var(--gutter)) minmax(0, 1fr);
  }

  @media (width < 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.titles {
  margin-inline-start: calc(-1 * var(--gutter));
  padding: 10px 0 8px var(--gutter);
  background-color: var(--color-episode-titles-bg);

  @media (width < 768px) {
    margin-inline-start: 0;
  }
}

.type {
  display: inline-block;
  margin: 0 5px 5px 0;
  padding: 3px 5px;
  background-color: var(--episode-color);
  color: var(--color-card-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-card-tag);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
}

h3 {
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-episode-title);
  font-weight: var(--font-weight-headings);

  & a {
    color: var(--color-episode-title);
    text-decoration: none;

    &:hover {
      color: var(--brand-primary);
      text-decoration: none;
    }
  }
}

.number {
  color: var(--brand-primary);
}

.meta {
  margin: 0;
  font-size: var(--font-size-episode-meta);
}

.unknown {
  color: var(--color-episode-unknown);
  font-style: italic;
}

.stats {
  margin: 5px 0 -10px calc(-1 * var(--gutter));
  padding: 7px 0 7px var(--gutter);
  background-color: var(--color-episode-stats-bg);
  font-family: var(--font-headings);
  font-size: var(--font-size-episode-meta);

  @media (width < 768px) {
    margin-inline-start: 0;
  }
}

.overview {
  margin: 15px 0 10px;
}
</style>
