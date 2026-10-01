<!--
  OG's Watch Now picker: a
  play icon, red while services are applied, that opens "Only display items available to watch on these streaming
  services." with the services to pick Applying reloads with `watchnow=` (the slugs, comma separated), which
  the worker's `sources` reads. `placeholder` is OG's All Types state: the icon only asks for a type first.
  The services load on first open, from `/watchnow/sources/:country`.
    <WatchNowFilter value={filters.watchnow} {country} favorites={settings?.browsing?.watchnow?.favorites ?? []} />
-->
<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import Dialog from '$lib/components/dialog/Dialog.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import play from '$lib/icons/thin/play.svg?raw';
import { api } from '../../api/api.ts';
import { favoriteSlugs, type Source, toSourceMap } from './watchNow.ts';

interface Props {
  /** The applied `watchnow` list. */
  value?: string;
  /** The viewer's watch-now country, lower case. */
  country: string;
  /** Their favorite services as API stores them (`us-netflix`). */
  favorites?: readonly string[];
  placeholder?: boolean;
}

const { value = '', country, favorites = [], placeholder = false }: Props = $props();
let open = $state(false);
let sources = $state<Map<string, Source> | null>(null);
let picked = $state<string[]>([]);
let search = $state('');

const applied = $derived(value.split(',').map((slug) => slug.trim()).filter(Boolean));
const favoriteSet = $derived(new Set(favoriteSlugs(favorites, country, country)));
const matches = (name: string) => name.toLowerCase().includes(search.trim().toLowerCase());
const groups = $derived.by(() => {
  const all = [...(sources ?? [])].map(([slug, source]) => ({ slug, name: source.name }));
  const mine = all.filter(({ slug }) => favoriteSet.has(slug));
  return [
    ...(favoriteSet.size > 0
      ? [{ title: 'Your Favorites', options: [{ slug: 'favorites', name: 'All Favorites' }, ...mine] }]
      : []),
    { title: 'Services', options: all.filter(({ slug }) => !favoriteSet.has(slug)) },
  ].map((group) => ({ ...group, options: group.options.filter(({ name }) => matches(name)) }));
});

async function show() {
  if (placeholder) return;
  picked = [...applied];
  search = '';
  open = true;
  if (sources) return;
  const response = await api().watchnow.sources.country({ params: { countryCode: country } }).catch(() => null);
  sources = toSourceMap(response?.status === 200 ? response.body : null, country);
}

function apply(event: SubmitEvent) {
  event.preventDefault();
  const url = new URL(page.url);
  url.searchParams.delete('page');
  if (picked.length > 0) url.searchParams.set('watchnow', picked.join(','));
  else url.searchParams.delete('watchnow');
  open = false;
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- the current page with a new query string
  void goto(url);
}
</script>

<Tooltip text={placeholder ? 'Choose a type to filter by streaming services' : 'Filter by Streaming Services'}>
  {#snippet trigger(tooltip)}
    <button type="button" class={['launcher', { selected: applied.length > 0, placeholder }]}
      aria-label="Filter by streaming services" aria-haspopup="dialog" aria-disabled={placeholder} onclick={show}
      {...tooltip}>
      <Icon svg={play} /><span class="caret"></span>
    </button>
  {/snippet}
</Tooltip>

<Dialog bind:open title="Filter by streaming services">
  {#snippet header(id)}
    <h2 {id} class="lead">Only display items available to<br />watch on these streaming services.</h2>
  {/snippet}
  <form class="watchnow-form" onsubmit={apply}>
    <p class="label" id="watchnow-services">Available to watch on</p>
    <div class="picker">
      <input type="search" placeholder="Choose services..." aria-label="Search services" bind:value={search} />
      <div class="options" role="group" aria-labelledby="watchnow-services" aria-busy={sources === null}>
        {#each groups as group (group.title)}
          {#if group.options.length > 0}
            <p class="group">{group.title}</p>
            {#each group.options as option (option.slug)}
              <label class="option">
                <input type="checkbox" value={option.slug} bind:group={picked} />{option.name}
              </label>
            {/each}
          {/if}
        {/each}
      </div>
    </div>
    <button type="submit" class="submit">Apply Filter</button>
  </form>
</Dialog>

<style>
.launcher {
  display: inline-flex;
  align-items: center;
  min-block-size: 0;
  margin-inline: 0 5px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-filter-watchnow);
  line-height: 1;
  vertical-align: middle;
  transition: color 0.5s;

  &.selected {
    color: var(--brand-primary);
  }

  &.placeholder {
    cursor: not-allowed;
  }
}

.caret {
  margin: 1px 0 0 2px;
  border-block-start: 4px solid;
  border-inline: 4px solid transparent;
}

.watchnow-form {
  display: grid;
  padding: 0 var(--space-dialog-inline) var(--space-dialog-inline);
  gap: 10px;
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  font-weight: normal;
  text-align: center;
}

/* checkin-modal h2. */
.lead {
  margin: 0;
  padding: var(--space-dialog-inline) var(--space-dialog-inline) var(--line-height-computed);
  font-family: var(--font-body);
  font-size: var(--font-size-modal-lead);
  text-align: center;
}

.label {
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  text-align: start;
  text-transform: uppercase;
}

.picker {
  border: 1px solid var(--color-input-border);
  text-align: start;

  & input[type='search'] {
    inline-size: 100%;
    border: 0;
  }
}

.options {
  max-block-size: var(--watchnow-filter-list-height);
  overflow-y: auto;
}

.group {
  margin: 0;
  padding: 5px 8px;
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  text-transform: uppercase;
}

.option {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 5px 15px;
  cursor: pointer;

  &:is(:hover, :focus-within) {
    background-color: var(--color-dropdown-hover-bg);
  }

  & input {
    margin: 0;
  }
}

.submit {
  border-color: var(--color-btn-primary-border);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>
