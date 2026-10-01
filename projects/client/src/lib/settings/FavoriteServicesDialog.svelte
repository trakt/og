<!--
  "Select your favorites". OG sent the viewer to onboarding's Watch Now step
, which og doesn't build, so its picker opens in a
  dialog instead: a country, a filter, the "N / M selected" count and every service in that country as a toggle,
  picked ones first. Picks from other countries stay picked. Nothing saves until the form does.
-->
<script lang="ts">
import Dialog from '$lib/components/dialog/Dialog.svelte';
import type { FilterSource } from '$lib/components/filters/watchNowFilter';
import ServiceTile from '$lib/components/watchnow/ServiceTile.svelte';
import { favoriteKey } from './favoriteKey';
import { toggleFavorite } from './toggleFavorite';
import type { WatchNowChoices } from './WatchNowChoices';

interface Props {
  open: boolean;
  favorites: readonly string[];
  /** The form's Watch Now country, where the picker starts. */
  home: string;
  countries: WatchNowChoices['countries'];
  sources: WatchNowChoices['sources'];
  /** Loads a country's services the first time the picker shows it. */
  onneed: (country: string) => void;
}

let { open = $bindable(), favorites = $bindable(), home, countries, sources, onneed }: Props = $props();

// svelte-ignore state_referenced_locally
let country = $state(home);
let query = $state('');
/** The services picked when this country opened, which list first like OG's and stay put while toggling. */
let pinned = $state<ReadonlySet<string>>(new Set());

const picked = $derived(
  new Set(favorites.map((key) => {
    const favorite = favoriteKey(key, home);
    return `${favorite.country}-${favorite.source}`;
  })),
);
const services = $derived<ReadonlyArray<[string, FilterSource]>>([...(sources[country] ?? new Map()).entries()]);
const ordered = $derived([
  ...services.filter(([slug]) => pinned.has(slug)),
  ...services.filter(([slug]) => !pinned.has(slug)),
]);
const shown = $derived.by(() => {
  const term = query.trim().toLowerCase();
  return term ? ordered.filter(([, source]) => source.name.toLowerCase().includes(term)) : ordered;
});
const count = $derived(services.filter(([slug]) => picked.has(`${country}-${slug}`)).length);
const loading = $derived(!sources[country]);

function pin() {
  pinned = new Set(services.flatMap(([slug]) => (picked.has(`${country}-${slug}`) ? [slug] : [])));
}

$effect(() => {
  if (open && loading) onneed(country);
});

// Pin once per opening and per country, once its services are in.
let pinnedFor = '';
$effect(() => {
  const key = open && !loading ? country : '';
  if (key === pinnedFor) return;
  pinnedFor = key;
  if (key) pin();
});

function onclose() {
  country = home;
  query = '';
}
</script>

<Dialog bind:open title="Select your favorite streaming services" size="xl" {onclose}>
  {#snippet header(id)}
    <div class="lead">
      <h2 {id}>Select your favorite streaming services</h2>
      <p>This helps us provide links to watch TV shows & movies. You can select services across different countries.</p>
    </div>
  {/snippet}
  <div class="picker">
    <div class="controls">
      <select aria-label="Country" bind:value={country}>
        {#if !countries.some(({ code }) => code === country)}<option value={country}>{country.toUpperCase()}</option>{/if}
        {#each countries as { code, name } (code)}<option value={code}>{name}</option>{/each}
      </select>
      <!-- The dialog sits inside the settings form: Enter filters, it doesn't save the form. -->
      <input type="search" placeholder="Filter Streaming Services..." aria-label="Filter streaming services"
        bind:value={query} onkeydown={(event) => event.key === 'Enter' && event.preventDefault()} />
    </div>
    <p class="count" aria-live="polite">
      {#if !loading}<b>{count}</b> / <b>{services.length}</b> selected{/if}
    </p>
    <div class="services" role="group" aria-label="Streaming services" aria-busy={loading}>
      {#each shown as [slug, source] (slug)}
        <ServiceTile
          link={{ ...source, slug, href: '' }}
          pressed={picked.has(`${country}-${slug}`)}
          onclick={() => (favorites = toggleFavorite({ favorites, country, source: slug, home }))}
        />
      {/each}
    </div>
    {#if !loading && shown.length === 0}<p class="none">Nothing found</p>{/if}
    <button type="button" class="done" onclick={() => (open = false)}>Done</button>
  </div>
</Dialog>

<style>
/* checkin-modal h2, with onboarding's h2 under it. */
.lead {
  padding: var(--space-dialog-inline) var(--space-dialog-inline) var(--line-height-computed);
  text-align: center;

  & h2 {
    margin: 0 0 var(--space-sm-block);
    font-family: var(--font-body);
    font-size: var(--font-size-modal-lead);
  }

  & p {
    margin: 0;
    color: var(--color-text-muted);
  }
}

.picker {
  display: grid;
  gap: var(--favorites-picker-gap);
  padding: 0 var(--space-dialog-inline) var(--space-dialog-inline);
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--favorites-picker-control-min), 1fr));
  gap: var(--favorites-picker-gap);
}

/* #watchnow-sources-count and #watchnow-filter-no-results. */
.count,
.none {
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  letter-spacing: 1px;
  text-transform: uppercase;

  & b {
    font-weight: var(--font-weight-headings-heavy);
  }
}

.services {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  max-block-size: var(--favorites-picker-height);
  margin-inline: calc(var(--space-dialog-inline) * -1);
  padding: 0 var(--favorites-picker-inset);
  overflow-y: auto;
  --service-width: var(--settings-service-width);
  --service-height: var(--settings-service-height);
  --service-padding: var(--favorites-picker-tile-padding);
}

.done {
  justify-self: center;
  border-color: var(--color-btn-primary-border);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>
