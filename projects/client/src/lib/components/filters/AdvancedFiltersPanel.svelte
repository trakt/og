<!--
  OG's advanced filter panel: the second sidebar
  the funnel slides out, with watch now, the period, the list filters with their any/all/none pickers, and the
  sliders, over sticky buttons. Render it in a Frame's `panel` snippet. The lists load from the API the first time
  it opens. Nothing applies until "Apply Filters", which calls `onapply`; OG only let VIPs apply, so everyone else
  gets "Unlock Filters with VIP". Esc closes it.
-->
<script lang="ts">
import { on } from 'svelte/events';
import Icon from '$lib/icons/Icon.svelte';
import caretDown from '$lib/icons/solid/caret-down.svg?raw';
import searchIcon from '$lib/icons/thin/magnifying-glass.svg?raw';
import check from '$lib/icons/solid/check.svg?raw';
import imdbLogo from '$lib/assets/sites/imdb-clean.png';
import rtAudience from '$lib/assets/sites/rt/audience-upright.svg';
import rtFresh from '$lib/assets/sites/rt/tomatometer-fresh.svg';
import traktLogo from '$lib/assets/sites/trakt.png';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import MultiSelect from '$lib/components/filters/MultiSelect.svelte';
import RangeSlider from '$lib/components/filters/RangeSlider.svelte';
import type { AdvancedFiltersConfig } from '$lib/components/filters/AdvancedFiltersConfig';
import {
  type AdvancedFilters,
  advancedFiltersSearch,
  hasAdvancedFilters,
  type ListFilterKey,
  type ListMode,
  type RangeFilterKey,
} from '$lib/components/filters/advancedFilters';
import { fetchFilterBody } from '$lib/components/filters/fetchFilterBody';
import { type FilterDraft, fromFilterDraft, toFilterDraft } from '$lib/components/filters/filterDraft';
import { mergeFilterOptions } from '$lib/components/filters/mergeFilterOptions';
import { episodeTypeOptions } from '$lib/components/filters/episodeTypeOptions';
import { type FilterOption, optionMappers, optionPaths, statusOptions } from '$lib/components/filters/filterOptions';
import { filterValueLabel } from '$lib/components/filters/filterTags';
import { type FilterSource, toFilterSources, watchNowOptions } from '$lib/components/filters/watchNowFilter';

interface Props {
  id: string;
  open: boolean;
  config: AdvancedFiltersConfig;
  /** The filters in the URL. */
  filters: AdvancedFilters;
  vip: boolean;
  /** The viewer's watch-now country and favorite services there (bare slugs). */
  country: string;
  favorites: readonly string[];
  /** The picked services, which the loader fetched for the sidebar: names for the chips until the list loads. */
  sources?: ReadonlyMap<string, FilterSource>;
  /** The page without any filters: "Clear". */
  clearHref: string;
  onapply: (filters: AdvancedFilters, period: string | undefined) => void;
  /** Esc: the page closes the panel and puts focus back on the funnel. */
  onclose: () => void;
}

const { id, open, config, filters, vip, country, favorites, sources, clearHref, onapply, onclose }: Props = $props();

const filtersOn = $derived(hasAdvancedFilters(fromFilterDraft(toFilterDraft(filters, config), config)));
// The controls start from the URL's filters, and start over whenever those change (a new page).
let draft = $derived<FilterDraft>(toFilterDraft(filters, config));
let period = $derived(config.period?.value);
const applied = $derived(advancedFiltersSearch(fromFilterDraft(toFilterDraft(filters, config), config)));
const dirty = $derived(
  advancedFiltersSearch(fromFilterDraft(draft, config)) !== applied || period !== config.period?.value,
);

const lists = {
  genres: { label: 'Genres', placeholder: 'Choose genres...', modes: ['any', 'all', 'none'] },
  certifications: { label: 'Certifications', placeholder: 'Choose certifications...', modes: ['any', 'none'] },
  languages: { label: 'Languages', placeholder: 'Choose languages...', modes: ['any', 'none'] },
  countries: { label: 'Countries', placeholder: 'Choose countries...', modes: ['any', 'none'] },
  networks: { label: 'Networks', placeholder: 'Choose networks...', modes: ['any', 'none'] },
  episode_types: { label: 'Episode Types', placeholder: 'Choose episode types...', modes: ['any', 'none'] },
  status: { label: 'Status', placeholder: 'Choose status...', modes: ['any', 'none'] },
} satisfies Record<ListFilterKey, { label: string; placeholder: string; modes: ListMode[] }>;

const ratingRows = {
  ratings: { site: 'Trakt', logo: traktLogo, format: (v: number) => `${v}%` },
  imdb_ratings: { site: 'IMDb', logo: imdbLogo, format: (v: number) => v.toFixed(1) },
  rt_meters: { site: 'Rotten Tomatoes', metric: 'Tomatometer', logo: rtFresh, format: (v: number) => `${v}%` },
  rt_user_meters: {
    site: 'Rotten Tomatoes',
    metric: 'Audience Score',
    logo: rtAudience,
    format: (v: number) => `${v}%`,
  },
} as const;
const isRating = (key: RangeFilterKey): key is keyof typeof ratingRows => Object.hasOwn(ratingRows, key);
const ratings = $derived(config.ranges.filter(isRating));

// The lists load once, the first time the panel opens.
let options = $state<Partial<Record<ListFilterKey, FilterOption[]>>>({
  status: [...statusOptions],
  episode_types: [...episodeTypeOptions],
});
let loadedSources = $state<ReadonlyMap<string, FilterSource>>();
let requestedKey = '';

$effect(() => {
  if (!open) return;
  const requestKey = JSON.stringify([config.type, config.optionTypes, config.lists, config.watchnow, country]);
  if (requestedKey === requestKey) return;
  requestedKey = requestKey;
  options = { status: [...statusOptions], episode_types: [...episodeTypeOptions] };
  loadedSources = undefined;
  for (const key of config.lists) {
    if (key === 'status' || key === 'episode_types') continue;
    Promise.all(
      (config.optionTypes ?? [config.type]).map((type) =>
        fetchFilterBody(optionPaths[key](type)).then(optionMappers[key])
      ),
    )
      .then((rows) => {
        if (requestedKey !== requestKey) return;
        options = { ...options, [key]: mergeFilterOptions(rows) };
      })
      .catch(() => {
        if (requestedKey === requestKey) options = { ...options, [key]: [] };
      });
  }
  if (config.watchnow) {
    fetchFilterBody(`/watchnow/sources/${country}`)
      .then((body) => {
        if (requestedKey === requestKey) loadedSources = toFilterSources(body, country);
      })
      .catch(() => {
        if (requestedKey === requestKey) loadedSources = new Map();
      });
  }
});

const watchnowGroups = $derived(
  watchNowOptions({ sources: loadedSources ?? new Map(), country, favorites: vip ? favorites : [] }),
);
const sourceName = (slug: string) =>
  slug === 'favorites' ? 'All Favorites' : (loadedSources ?? sources)?.get(slug)?.name ?? slug;

let panel = $state<HTMLElement>();

// Opening moves focus into the panel, like a disclosure's content.
$effect(() => {
  if (open) panel?.querySelector<HTMLElement>('input, select')?.focus({ preventScroll: true });
});

function onkeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  event.preventDefault();
  onclose();
}

function apply() {
  onapply(fromFilterDraft(draft, config), period);
}

const setList = (
  key: ListFilterKey,
  values: readonly string[],
) => (draft = { ...draft, [key]: { ...draft[key], values } });
const isMode = (value: string): value is ListMode => value === 'any' || value === 'all' || value === 'none';
const setMode = (key: ListFilterKey, mode: string) => {
  if (isMode(mode)) draft = { ...draft, [key]: { ...draft[key], mode } };
};
const setRange = (
  key: RangeFilterKey,
  range: readonly [number, number],
) => (draft = { ...draft, ranges: { ...draft.ranges, [key]: range } });
</script>

<!-- The VIP page is an OG route og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<section {id} class={['advanced-filters', { open }]} aria-label="Advanced filters" inert={!open} bind:this={panel}
  {@attach (node) => on(node, 'keydown', onkeydown)}>
  <div class="inner">
    {#if config.watchnow}
      <div class="row single">
        <MultiSelect
          options={watchnowGroups}
          label="Available to watch on"
          placeholder="Choose streaming services..."
          labelFor={sourceName}
          loading={!loadedSources}
          bind:value={() => draft.watchnow, (values) => (draft = { ...draft, watchnow: values })}
        />
      </div>
    {/if}

    {#if config.period}
      <div class="row single select">
        <select aria-label="Time period" bind:value={period}>
          {#each config.period.options as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <Icon svg={caretDown} />
      </div>
    {/if}

    {#if config.query}
      <div class="row single terms">
        <input type="search" aria-label="Filter Terms" placeholder="Filter by titles and descriptions..." bind:value={() => draft.query, (query) => (draft = { ...draft, query })}
          onkeydown={(event) => { if (event.key === 'Enter' && vip) { event.preventDefault(); apply(); } }} />
        <span class="terms-icon"><Icon svg={searchIcon} /><Icon svg={caretDown} /></span>
      </div>
    {/if}

    {#each config.lists as key (key)}
      {@const list = lists[key]}
      <div class="row">
        <MultiSelect
          options={[{ options: options[key] ?? [] }]}
          label={list.label}
          placeholder={list.placeholder}
          labelFor={(value) => filterValueLabel(key, value)}
          loading={!options[key]}
          bind:value={() => draft[key].values, (values) => setList(key, values)}
        />
        <span class="conjunction">
          <select aria-label="{list.label}: match" value={draft[key].mode}
            onchange={(event) => setMode(key, event.currentTarget.value)}>
            {#each list.modes as mode (mode)}<option value={mode}>{mode}</option>{/each}
          </select>
          <Icon svg={caretDown} />
        </span>
      </div>
    {/each}

    {#if config.ranges.includes('years')}
      {@const [min, max] = draft.ranges.years}
      <p class="label" id="{id}-years">Released in <b>{min}</b> to <b>{max}</b></p>
      <RangeSlider scale={config.scales.years} label="Released"
        bind:value={() => draft.ranges.years, (range) => setRange('years', range)} />
    {/if}

    {#if config.ranges.includes('runtimes')}
      {@const [min, max] = draft.ranges.runtimes}
      <p class="label">Runtime of <b>{min}</b> to <b>{max}</b> minutes</p>
      <RangeSlider scale={config.scales.runtimes} label="Runtime"
        bind:value={() => draft.ranges.runtimes, (range) => setRange('runtimes', range)} />
    {/if}

    {#if ratings.length > 0}
      <p class="label">Site Ratings</p>
      {#each ratings as key (key)}
        {@const row = ratingRows[key]}
        {@const metric = 'metric' in row ? row.metric : undefined}
        <div class="rating">
          <!-- OG's site tooltip, on the left. The slider's label names the site too, for keyboard and screen readers. -->
          <Tooltip placement="left">
            {#snippet trigger(tooltip)}<span class="site" {...tooltip}><img src={row.logo} alt="" /></span>{/snippet}
            {row.site}{#if metric}<br /><em class="metric">{metric}</em>{/if}
          </Tooltip>
          <RangeSlider labeled scale={config.scales[key]} label="{row.site}{metric ? ` ${metric}` : ''} rating" format={row.format}
            bind:value={() => draft.ranges[key], (range) => setRange(key, range)} />
        </div>
      {/each}
    {/if}

    <div class={['buttons', { vip }]}>
      {#if !vip}
        <a class="button primary unlock" href="/vip/filtering">Unlock Filters with VIP</a>
      {:else if filtersOn || dirty}
        <a class="button close" href={clearHref}>Clear</a>
        <button type="button" class="button primary" onclick={apply}>
          {filtersOn ? 'Apply Edits' : 'Apply Filters'}<Icon svg={check} />
        </button>
      {:else}
        <button type="button" class="button close" onclick={onclose}>Close</button>
        <button type="button" class="button primary" disabled>Configure Filters<Icon svg={check} /></button>
      {/if}
    </div>
  </div>
</section>

<style>
/* A 300px column that opens from nothing, between the sidebar and the grid (the Frame gives it its track). */
.advanced-filters {
  min-block-size: 100vh;
  overflow: clip;
  background-color: var(--color-filter-panel-bg);
  opacity: 0;

  &.open {
    opacity: 1;
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: opacity var(--transition-frame);
  }

  @media (max-width: 767px) {
    min-block-size: 0;

    &:not(.open) {
      display: none;
    }
  }
}

.inner {
  position: sticky;
  inset-block-start: 0;
  display: flex;
  flex-direction: column;
  inline-size: var(--sidenav-width);
  block-size: 100vh;
  padding: var(--header-height) var(--gutter) var(--gutter);
  overflow-y: auto;
  scrollbar-width: none;
  color: var(--color-frame-text);

  @media (max-width: 767px) {
    position: static;
    inline-size: auto;
    block-size: auto;
    padding-block-start: 0;
  }
}

.terms {
  position: relative;
  & input {
    inline-size: 100%;
    min-block-size: 0;
    block-size: var(--filter-control-height);
    padding: 0 var(--filter-select-padding) 0 var(--space-xs-inline);
    border: 0;
    border-radius: var(--radius-filter-control);
    background-color: var(--color-filter-control-bg);
    color: var(--color-filter-control-text);
    font-family: sans-serif;
    font-size: var(--font-size-filter-control);
    box-shadow: none;
    &::placeholder {
      color: var(--color-input-placeholder);
    }
  }
}

.terms-icon {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-end: var(--space-xs-inline);
  display: flex;
  align-items: center;
  color: var(--color-filter-label);
  font-size: var(--font-size-filter-control);
  translate: 0 -50%;
  pointer-events: none;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--filter-conjunction-width);
  align-items: start;
  margin-block-start: var(--filter-row-gap);
  margin-inline-end: calc(-1 * var(--filter-conjunction-overhang));

  &.single {
    grid-template-columns: minmax(0, 1fr);
    margin-inline-end: 0;
  }
}

select {
  appearance: none;
  min-block-size: 0;
  border: 0;
  border-radius: var(--radius-filter-control);
  box-shadow: none;
}

.select {
  position: relative;

  & select {
    inline-size: 100%;
    block-size: var(--filter-control-height);
    padding: 0 var(--filter-select-padding) 0 var(--space-lg-block);
    background-color: var(--color-filter-control-bg);
    color: var(--color-filter-control-text);
    font-size: var(--font-size-filter-control);
  }

  & :global(.icon) {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-end: var(--space-lg-block);
    color: var(--color-filter-label);
    font-size: var(--font-size-filter-conjunction);
    translate: 0 -50%;
    pointer-events: none;
  }
}

/* OG's any/all/none picker: small grey caps to the field's right, brighter on hover. "None" runs a little wider and
   over the field's edge, like OG's. */
.conjunction {
  position: relative;
  justify-self: end;
  min-inline-size: var(--filter-conjunction-width);
  opacity: 0.6;

  &:is(:hover, :focus-within) {
    opacity: 1;
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: opacity var(--transition-frame);
  }

  & select {
    inline-size: 100%;
    field-sizing: content;
    block-size: var(--filter-control-height);
    padding: 0 var(--filter-conjunction-caret) 0 var(--filter-conjunction-padding);
    background: none;
    color: var(--color-filter-label);
    font-family: var(--font-headings);
    font-size: var(--font-size-filter-conjunction);
    font-weight: var(--font-weight-headings);
    text-transform: uppercase;
    cursor: pointer;

    & option {
      background-color: var(--color-filter-conjunction-menu);
      color: var(--color-filter-control-text);
    }
  }

  & :global(.icon) {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-end: var(--filter-conjunction-caret-offset);
    color: var(--color-filter-label);
    font-size: var(--font-size-filter-conjunction);
    translate: 0 -50%;
    pointer-events: none;
  }
}

/* The panel is a flex column, so nothing collapses: each gap is the larger of OG's two touching margins. */
.label {
  margin: var(--filter-row-gap) 0 0;
  color: var(--color-filter-label);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
  text-transform: uppercase;

  & b {
    color: var(--color-filter-label-value);
    font-weight: inherit;
  }

  & + :global(.slider) {
    margin-block-start: var(--filter-slider-gap);
  }
}

/* A rating slider with its site's logo hanging into the left padding. */
.rating {
  display: grid;
  grid-template-columns: var(--filter-site-width) minmax(0, 1fr);
  align-items: center;
  block-size: var(--slider-height);
  margin: var(--filter-rating-gap) var(--filter-rating-inset-end) 0 calc(-1 * var(--filter-site-overhang));
  column-gap: var(--filter-rating-site-gap);

  .label + & {
    margin-block-start: var(--filter-slider-gap);
  }

  & img {
    display: block;
    inline-size: var(--filter-site-width);
  }
}

/* OG's `.collection-metadata` inside a tooltip. */
.metric {
  color: var(--color-tooltip-muted);
}

.buttons {
  position: sticky;
  inset-block-end: calc(-1 * var(--gutter));
  z-index: 3;
  display: grid;
  flex-shrink: 0;
  margin-block-start: auto;
  grid-template-columns: var(--filter-close-width) auto;
  gap: var(--space-lg-block);
  margin-inline: calc(-1 * var(--gutter));
  margin-block-end: calc(-1 * var(--gutter));
  padding: var(--filter-buttons-top) var(--gutter) var(--gutter);
  background: linear-gradient(to bottom, transparent 0%, var(--color-filter-panel-bg) 30%);

  &:not(.vip) {
    grid-template-columns: 1fr;
  }
}

.button {
  display: block;
  min-block-size: 0;
  padding: var(--space-base-block) var(--space-base-inline);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-headings);
  font-size: var(--font-size-nav);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-base);
  text-align: start;
  text-decoration: none;

  @media (prefers-reduced-motion: no-preference) {
    transition: background-color var(--transition-frame), opacity var(--transition-frame);
  }

  & :global(.icon) {
    float: inline-end;
    margin-block-start: 2px;
  }
}

.close {
  background-color: var(--color-btn-close-bg);
  color: var(--color-btn-close-text);
  text-align: center;

  &:is(:hover, :focus-visible) {
    background-color: var(--color-btn-close-bg-hover);
    color: var(--color-btn-close-text);
  }
}

.primary {
  background-color: var(--brand-primary);
  color: var(--color-frame-text);

  &:is(:hover, :focus-visible):not(:disabled) {
    background-color: var(--brand-primary-darken);
    color: var(--color-frame-text);
  }

  &:disabled {
    opacity: 0.2;
  }
}

.unlock {
  text-align: center;
}
</style>
