<!--
  OG's where-to-watch modal : the title over the
  item's fanart, "Your Favorites" and one section per offer type, then a country picker and "Powered by JustWatch"
  on the backdrop underneath. It loads on first open, like OG did, and a new country only loads that country's
  service names: one `/watchnow` call has every country's offers.
-->
<script lang="ts">
import justwatchLogo from '$lib/assets/sites/justwatch-logo.svg';
import Dialog from '$lib/components/dialog/Dialog.svelte';
import FanartTitle from '$lib/components/dialog/FanartTitle.svelte';
import { fetchWatchNow } from './fetchWatchNow.ts';
import ServiceTile from './ServiceTile.svelte';
import {
  countryCounts,
  favoriteSlugs,
  https,
  type Source,
  toSourceMap,
  toWatchNowSections,
  type WatchNowButton,
} from './watchNow.ts';
import {
  justWatchLinksSchema,
  watchNowCountriesSchema,
  type WatchNowCountry,
  type WatchNowOffers,
  watchNowOffersSchema,
  watchNowSourcesSchema,
} from './watchNowSchema.ts';

interface Props {
  open: boolean;
  button: WatchNowButton;
  title: string;
  year?: number | null;
  fanart?: string;
}

let { open = $bindable(), button, title, year, fanart }: Props = $props();

// svelte-ignore state_referenced_locally
let country = $state(button.country);
let offers = $state<WatchNowOffers | null>(null);
let countries = $state<WatchNowCountry[]>([]);
let justwatch = $state<Record<string, string | null | undefined>>({});
let sources = $state<Record<string, Map<string, Source>>>({});
let loaded = $state(false);

// An episode's JustWatch page is its season's, like OG.
const justwatchPath = $derived(button.path.replace(/\/episodes\/\d+$/, ''));

async function loadItem() {
  const [all, list, links] = await Promise.all([
    fetchWatchNow({ path: `${button.path}/watchnow`, schema: watchNowOffersSchema }),
    fetchWatchNow({ path: '/watchnow/countries', schema: watchNowCountriesSchema }),
    fetchWatchNow({ path: `${justwatchPath}/watchnow/justwatch_links`, schema: justWatchLinksSchema }),
  ]);
  offers = all;
  countries = list ?? [];
  justwatch = links ?? {};
  loaded = true;
}

async function loadSources(code: string) {
  const response = await fetchWatchNow({ path: `/watchnow/sources/${code}`, schema: watchNowSourcesSchema });
  sources = { ...sources, [code]: toSourceMap(response, code) };
}

$effect(() => {
  if (open && !loaded) void loadItem();
});

$effect(() => {
  if (open && !sources[country]) void loadSources(country);
});

const counts = $derived(countryCounts(offers));
const sections = $derived(
  toWatchNowSections({
    offers: offers?.[country],
    sources: sources[country] ?? new Map(),
    favorites: favoriteSlugs(button.favoriteKeys, country, button.country),
  }),
);
const loading = $derived(!loaded || !sources[country]);
const flag = $derived(countries.find(({ code }) => code === country)?.images?.flag);
// OG linked the item's JustWatch page, or JustWatch's home for the country (which calls Britain "uk").
const poweredBy = $derived.by(() => {
  const link = justwatch[country];
  return link ? https(link) : `https://www.justwatch.com/${country === 'gb' ? 'uk' : country}`;
});
</script>

<Dialog bind:open title="Where to watch {title}" size="xl" lightDismiss>
  {#snippet header(id)}
    <FanartTitle {id} eyebrow="Where to watch" {title} {year} {fanart} />
  {/snippet}

  <div class={['streaming-links', { loading }]} aria-busy={loading}>
    {#each sections as section (section.title)}
      <h3 class="section-title">{section.title}</h3>
      <div class="section">
        {#each section.links as link (link.slug)}
          <ServiceTile {link} price={link.price} uhd={link.uhd} />
        {/each}
      </div>
    {:else}
      {#if !loading}
        <p class="no-links">We couldn't find any watch now links for your country. Check back soon!</p>
      {/if}
    {/each}
  </div>

  {#snippet footer()}
    <div class="footer">
      {#if countries.length > 0}
        <span class="country">
          {#if flag}<img src={https(flag)} alt="" />{/if}
          <select bind:value={country} aria-label="Country">
            {#each countries as { code, name } (code)}
              <option value={code}>{name}{counts[code] ? ` (${counts[code]})` : ''}</option>
            {/each}
          </select>
        </span>
      {/if}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a class="powered-by" href={poweredBy} target="_blank" rel="noopener">
        Powered by <img src={justwatchLogo} alt="JustWatch" />
      </a>
    </div>
  {/snippet}
</Dialog>

<style>
.streaming-links {
  margin-block-end: 10px;
  --service-width: var(--watch-now-modal-tile-width);
  --service-height: var(--watch-now-modal-tile-height);
  --service-padding: 0 10px 20px;

  @media (width < 768px) {
    --service-width: var(--watch-now-modal-tile-width-sm);
    --service-height: var(--watch-now-modal-tile-height-sm);
    --service-padding: 0 5px 15px;
  }

  &.loading {
    opacity: 0.5;
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: opacity var(--transition-card);
  }
}

.section-title {
  margin: 0 0 10px;
  padding-inline-start: 30px;
  border-block-end: 1px solid var(--color-dialog-title-border);
  color: var(--color-watch-now-section);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-base);
  text-transform: uppercase;

  @media (width < 768px) {
    padding-inline-start: 15px;
  }
}

.section {
  margin-inline: var(--gutter);

  @media (width < 768px) {
    margin-inline: 10px;
  }
}

.no-links {
  margin: 0;
  padding: 10px 30px 15px;
  font-style: italic;
}

/* On the backdrop, under the panel. */
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  color: var(--color-text-inverse);
  font-size: 11px;
}

.country {
  display: flex;
  align-items: center;
  gap: 5px;

  & img {
    inline-size: 20px;
    block-size: 20px;
  }

  & select {
    padding: 0 12px 0 0;
    border: 0;
    appearance: none;
    background: transparent var(--select-arrow-inverse) no-repeat 100% 50%;
    color: inherit;
    font: inherit;

    & option {
      color: initial;
    }
  }
}

.powered-by {
  display: flex;
  align-items: center;
  gap: 3px;
  color: inherit;
  text-decoration: none;

  & img {
    block-size: 10px;
  }
}
</style>
