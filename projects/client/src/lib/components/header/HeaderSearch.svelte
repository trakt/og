<!--
  The header search: the field, the type
  picker and the autocomplete dropdown. Focus widens the box and turns it white. Typing waits 300ms, then shows up
  to 3 results and a "View all" row. Arrows move the highlight (a combobox with `aria-activedescendant`), Enter opens
  it or submits the form, Esc closes the dropdown, and a click outside closes it (and clears an empty field).
  The type picks the form's `/search/<type>` action and is kept in the `search_type` cookie so SSR renders its label.
  Recent and trending query rows go under the results.
-->
<script lang="ts">
import { afterNavigate } from '$app/navigation';
import { page } from '$app/state';
import Icon from '$lib/icons/Icon.svelte';
import { untrack } from 'svelte';
import { requestRecentSearch } from '$lib/components/header/requestRecentSearch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { toast } from '$lib/components/toast/toast.svelte';
import { createRecentSearches } from '$lib/components/header/createRecentSearches.svelte';
import clockRotateLeft from '$lib/icons/light/clock-rotate-left.svg?raw';
import termMagnifier from '$lib/icons/light/magnifying-glass.svg?raw';
import termXmark from '$lib/icons/light/xmark.svg?raw';
import arrowTurnDownLeft from '$lib/icons/light/arrow-turn-down-left.svg?raw';
import magnifyingGlass from '$lib/icons/regular/magnifying-glass.svg?raw';
import xmark from '$lib/icons/regular/xmark.svg?raw';
import { searchAutocomplete, type SearchAutocompleteResult } from './searchAutocomplete.ts';
import { searchTypes } from './searchTypes.ts';

const { savedType = '', viewer = null }: { savedType?: string; viewer?: string | null } = $props();

let recent = $state<ReturnType<typeof createRecentSearches>>();
$effect(() => {
  const identity = viewer;
  let storage: Storage | undefined;
  try {
    storage = localStorage;
  } catch { /* Memory-only history is still usable. */ }
  const controller = createRecentSearches({
    viewer: identity,
    storage,
    notify: toast.error,
    request: (path, body) =>
      requestRecentSearch({
        fetch: identity ? authenticatedFetch({ manager: userManager() }) : undefined,
        path,
        body,
      }),
  });
  recent = controller;
  return () => controller.dispose();
});

const id = $props.id();
const DEBOUNCE_MS = 300;
const ONE_YEAR_S = 60 * 60 * 24 * 365;
const empty: SearchAutocompleteResult = { rows: [], count: null };

const findType = (slug: string | undefined) => searchTypes.find((type) => type.slug === slug);

// On a results page (`/search/<type>?query=`) the page's type and query win over the cookie.
const fromUrl = (url: URL) => {
  const [section, slug = ''] = url.pathname.split('/').slice(1);
  if (section !== 'search') return null;
  return { slug: findType(slug)?.slug ?? '', query: url.searchParams.get('query') ?? url.searchParams.get('q') ?? '' };
};

const initial = fromUrl(page.url);
// The cookie only seeds the picker; after that the user's pick lives here.
let typeSlug = $state<string>(initial?.slug ?? findType(untrack(() => savedType))?.slug ?? '');
let query = $state(initial?.query ?? '');
let focused = $state(false);
let open = $state(false);
let result = $state(empty);
let highlight = $state(-1);
let input = $state<HTMLInputElement>();
let typeMenu = $state<HTMLElement>();

const type = $derived(findType(typeSlug) ?? searchTypes[0]);
const action = $derived(type.slug ? `/search/${type.slug}` : '/search');
const allHref = $derived(`${action}?${new URLSearchParams({ query })}`);
const terms = $derived([
  ...(recent?.user ?? []).map((term) => ({ term, recent: true })),
  ...(recent?.global ?? []).map((term) => ({ term, recent: false })),
]);
const resultOptionCount = $derived(result.rows.length + (result.count ? 1 : 0));
const options = $derived([
  ...result.rows.map((row, index) => ({ id: `${id}-option-${index}`, href: row.href })),
  ...(result.count ? [{ id: `${id}-option-all`, href: allHref }] : []),
  ...terms.map((_, index) => ({ id: `${id}-term-${index}`, href: '' })),
]);
const expanded = $derived(focused && open && (options.length > 0 || Boolean(viewer && recent?.loaded)));
const activeId = $derived(expanded && highlight >= 0 ? options.at(highlight)?.id : undefined);

let timer: ReturnType<typeof setTimeout> | undefined;
let inflight: AbortController | undefined;

// OG never cancelled a slow request, so a late answer could replace newer results. Aborting the last one drops it.
const runSearch = () => {
  clearTimeout(timer);
  inflight?.abort();
  highlight = -1;

  const text = query.trim();
  if (!text) {
    result = empty;
    return;
  }

  const searched = type;
  timer = setTimeout(async () => {
    const controller = new AbortController();
    inflight = controller;
    const next = await searchAutocomplete({
      type: searched,
      query: text,
      dates: page.data.datePreferences,
      signal: controller.signal,
    }).catch(() => null);
    if (!next || controller.signal.aborted) return;
    result = next;
    highlight = -1;
  }, DEBOUNCE_MS);
};

const close = (clear: boolean) => {
  focused = false;
  open = false;
  highlight = -1;
  if (!clear) return;
  clearTimeout(timer);
  inflight?.abort();
  query = '';
  result = empty;
};

// The close button hides itself, so a keyboard press (no pointer, detail 0) hands focus back to the field.
const clearSearch = (event: MouseEvent) => {
  close(true);
  if (event.detail === 0) input?.focus();
};

const pickType = (slug: string) => {
  typeSlug = slug;
  document.cookie = `search_type=${slug}; max-age=${ONE_YEAR_S}; path=/; samesite=lax`;
  typeMenu?.hidePopover();
  open = true;
  input?.focus();
  runSearch();
};

const onfocus = () => {
  focused = true;
  open = true;
  highlight = -1;
  void recent?.load();
};

const oninput = () => {
  open = true;
  runSearch();
};

const moveHighlight = (step: 1 | -1) => {
  const count = options.length;
  if (!count) return;
  if (!expanded) {
    open = true;
    return;
  }
  // Down wraps to the top; up from the top (or from nothing) wraps to the bottom, like OG.
  highlight = highlight < 0 && step < 0 ? count - 1 : (highlight + step + count) % count;
};

// Cmd or Ctrl+Enter opens a new tab. Otherwise click the row's own link, so SvelteKit's router handles it.
const openOption = (option: { id: string; href: string }, newTab: boolean) => {
  if (!option.href) {
    document.getElementById(option.id)?.querySelector('button')?.click();
    return;
  }
  if (newTab) {
    const row = result.rows.at(highlight);
    if (row && highlight < result.rows.length) record(row);
    window.open(option.href, '_blank', 'noopener');
    return;
  }
  document.getElementById(option.id)?.querySelector('a')?.click();
};

const onkeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
    return;
  }

  if (event.key === 'Escape') {
    // A search field clears itself on Esc. OG only closed the dropdown.
    event.preventDefault();
    open = false;
    input?.blur();
    return;
  }

  if (event.key === 'Delete' && highlight >= resultOptionCount) {
    const item = terms.at(highlight - resultOptionCount);
    if (item?.recent) {
      event.preventDefault();
      void recent?.remove(item.term);
      highlight = -1;
    }
    return;
  }

  if (event.key !== 'Enter') return;
  // Nothing highlighted: the form submits to /search/<type>?query=.
  const option = expanded && highlight >= 0 ? options.at(highlight) : undefined;
  if (!option) return;
  event.preventDefault();
  openOption(option, event.metaKey || event.ctrlKey);
};

const termType = (slug: string | null | undefined) =>
  findType(slug === 'all' ? '' : slug === 'official_lists' ? 'lists' : slug ?? '') ?? searchTypes[0];
const termLabel = (slug: string) => slug === 'official_lists' ? 'Official Lists' : termType(slug).label;
const pickTerm = (term: { query: string; type?: string | null }) => {
  query = term.query;
  pickType(termType(term.type).slug);
};
const record = (row: SearchAutocompleteResult['rows'][number]) => {
  void recent?.record(row.recent);
};

// A click or focus outside closes the dropdown. With nothing typed, it closes the whole search like OG.
const dismissOutside = (root: HTMLElement) => {
  const dismiss = (event: Event) => {
    if (!focused || (event.target instanceof Node && root.contains(event.target))) return;
    if (query) open = false;
    else close(true);
  };
  document.addEventListener('pointerdown', dismiss);
  document.addEventListener('focusin', dismiss);
  return () => {
    document.removeEventListener('pointerdown', dismiss);
    document.removeEventListener('focusin', dismiss);
  };
};

// The header stays across client-side navigation, so reset it the way a fresh OG page load would.
afterNavigate(({ to }) => {
  close(false);
  input?.blur();
  const next = to ? fromUrl(to.url) : null;
  if (!next) return;
  typeSlug = next.slug;
  query = next.query;
  result = empty;
});
</script>

<!-- Rows link to OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<search class={['header-search', { focused, expanded }]} {@attach dismissOutside}>
  <form {action} method="get">
    <label for="{id}-query" class="search-icon"><Icon svg={magnifyingGlass} /></label>
    <button type="button" class="close" aria-label="Clear search" onclick={clearSearch}>
      <Icon svg={xmark} />
    </button>
    <input
      bind:this={input}
      bind:value={query}
      id="{id}-query"
      type="search"
      name="query"
      placeholder="Is it me you're looking for?"
      aria-label="Search {type.label}"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      aria-controls="{id}-results"
      aria-expanded={expanded}
      aria-activedescendant={activeId}
      {onfocus}
      {oninput}
      {onkeydown}
    />

    <div class="type" style:anchor-name="--search-type-{id}">
      <button type="button" class="type-toggle" popovertarget="{id}-types" aria-label="Search in: {type.label}">
        {type.label}
      </button>
      <div
        bind:this={typeMenu}
        id="{id}-types"
        class="type-menu"
        popover="auto"
        style:position-anchor="--search-type-{id}"
        ontoggle={(event) => event.newState === 'open' && typeMenu?.querySelector('button')?.focus()}
      >
        <ul>
          {#each searchTypes as option (option.slug)}
            {#if 'divider' in option}<li role="separator"></li>{/if}
            <li>
              <button type="button" aria-current={option.slug === type.slug} onclick={() => pickType(option.slug)}>
                {option.label}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="autocomplete" hidden={!expanded}>
      <ul id="{id}-results" role="listbox" aria-label="Search results" onpointerleave={() => (highlight = -1)}>
        {#each result.rows as row, index (row.key)}
          <li
            id="{id}-option-{index}"
            role="option"
            aria-selected={highlight === index}
            class={['result', { selected: highlight === index }]}
            onpointerenter={() => (highlight = index)}
          >
            <a href={row.href} tabindex="-1" onclick={() => record(row)}>
              <span class={['poster', { avatar: row.avatar }]}>
                {#if row.poster}
                  <img src={row.poster} alt="" width="50" height={row.avatar ? 50 : 75} loading="lazy" />
                {/if}
              </span>
              <span class="info">
                {#if row.topTitle}<span class="top-title">{row.topTitle}</span>{/if}
                <span class="title">{row.title}</span>
                <span class="tags">
                  <span class="tag type-tag">{row.type}</span>
                  {#if row.tag}<span class="tag">{row.tag}</span>{/if}
                </span>
                {#if row.genres}<span class="genres">{row.genres}</span>{/if}
              </span>
            </a>
          </li>
        {/each}
        {#if result.count}
          {@const index = result.rows.length}
          <li
            id="{id}-option-all"
            role="option"
            aria-selected={highlight === index}
            class={['all-results', { selected: highlight === index }]}
            onpointerenter={() => (highlight = index)}
          >
            <a href={allHref} tabindex="-1">
              <span class="term-icon"><Icon svg={arrowTurnDownLeft} /></span>View all <strong>{result.count}</strong>
              results <span class="in-type">in {type.label}</span>
            </a>
          </li>
        {/if}
        {#if viewer && recent?.loaded && !recent.user.length}
          <li role="presentation" class="no-recent">You have no recent searches.</li>
        {/if}
        {#each terms as item, termIndex (`${item.recent}:${item.term.query}:${item.term.type}`)}
          {@const index = resultOptionCount + termIndex}
          {#if !item.recent && termIndex === (recent?.user.length ?? 0)}
            <li role="presentation" class="trending-heading">Trending Searches</li>
          {/if}
          <li
            id="{id}-term-{termIndex}"
            role="option"
            aria-selected={highlight === index}
            class={['search-term', { selected: highlight === index, 'first-term': item.recent && termIndex === 0 }]}
            onpointerenter={() => (highlight = index)}
          >
            <button type="button" class="reuse-term" tabindex="-1" onclick={() => pickTerm(item.term)}>
              <span class="term-icon"><Icon svg={item.recent ? clockRotateLeft : termMagnifier} /></span>
              {item.term.query}
              {#if item.term.type}<span class="in-type"> in {termLabel(item.term.type)}</span>{/if}
            </button>
            {#if item.recent}
              <button
                type="button"
                class="remove-term"
                aria-label="Remove recent search: {item.term.query}"
                disabled={recent?.busy}
                onclick={() => { void recent?.remove(item.term); highlight = -1; input?.focus(); }}
              ><Icon svg={termXmark} /></button>
            {/if}
          </li>
        {/each}
      </ul>
      {#if result.count}<div class="all-results-spacer"></div>{/if}
    </div>
  </form>
</search>

<style>
/* The field: translucent at rest, white on hover and focus (OG's .hovered and .focused). */
form {
  position: relative;
  max-inline-size: var(--search-max-width);

  /* OG widened to 500px and let the rest of the bar squeeze. Montserrat leaves no room to squeeze, so stop at the
     column's edge instead of pushing Sign In off the screen. */
  .focused & {
    min-inline-size: min(var(--search-focused-min-width), 100%);
  }
}

.search-icon,
.close {
  position: absolute;
  inset-inline-start: 14px;
  z-index: 1;
  color: var(--color-header-text);
  cursor: pointer;
}

.search-icon {
  inset-block-start: 13px;

  .header-search:hover & {
    color: var(--color-header-active-text);
  }

  .focused & {
    display: none;
  }
}

/* fa-regular fa-close fa-lg, in the magnifier's place. */
.close {
  display: none;
  inset-block: 0;
  align-items: center;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-header-active-text);
  font-size: 1.3333em;

  .focused & {
    display: flex;
  }
}

input {
  /* 250px like OG, grown to fit the placeholder: Montserrat runs wider than OG's Proxima Nova. */
  min-inline-size: 250px;
  field-sizing: content;
  min-block-size: 0;
  padding: 0 var(--space-lg-inline) 0 40px;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--color-header-search-bg);
  backdrop-filter: var(--blur-header);
  box-shadow: none;
  color: var(--color-header-text);
  font-size: var(--font-size-nav);
  line-height: var(--search-control-height);
  cursor: pointer;
  appearance: none;
  transition: background-color 0.25s, color 0.25s;

  &::placeholder {
    color: var(--gray-lightish);
  }

  &::-webkit-search-cancel-button {
    display: none;
  }

  &:focus-visible {
    outline: none;
  }

  &:is(:hover, :focus),
  .focused & {
    background-color: var(--color-box);
    box-shadow: none;
    color: var(--color-header-active-text);
    cursor: text;

    &::placeholder {
      color: var(--gray-light);
    }
  }

  .focused & {
    inline-size: 100%;
    field-sizing: fixed;
  }

  /* Squared off onto the dropdown, with OG's red rule between them. */
  .expanded & {
    border-end-start-radius: 0;
    border-end-end-radius: 0;
    border-block-end: 1px solid var(--brand-primary);
  }
}

/* The type picker sits inside the right end of the focused box. */
.type {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  z-index: 2;
  display: none;

  .focused & {
    display: block;
  }
}

.type-toggle {
  position: relative;
  /* OG's 140px, grown to fit the label and caret: Montserrat runs wider than OG's Proxima Nova. */
  min-inline-size: var(--search-type-width);
  min-block-size: 0;
  padding: 0 26px 0 var(--space-lg-inline);
  white-space: nowrap;
  border: 0;
  border-start-end-radius: var(--radius-lg);
  border-end-end-radius: var(--radius-lg);
  background-color: var(--color-box);
  color: var(--color-dropdown-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--search-control-height);
  text-align: start;

  .expanded & {
    border-end-end-radius: 0;
  }

  /* Bootstrap's caret. */
  &::after {
    content: '';
    position: absolute;
    inset-block-start: 20px;
    inset-inline-end: 10px;
    border-block-start: 4px solid;
    border-inline: 4px solid transparent;
  }

  &:focus-visible {
    outline-offset: -2px;
  }
}

.type-menu {
  position: fixed;
  position-area: bottom span-left;
  inset: auto;
  min-inline-size: var(--search-type-width);
  margin: 1px 0 0;
  padding: var(--space-lg-block) 0;
  border: 0;
  border-end-start-radius: var(--radius-lg);
  border-end-end-radius: var(--radius-lg);
  background-color: var(--color-box);
  color: var(--color-dropdown-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  box-shadow: var(--shadow-dropdown);

  & ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  & button {
    display: block;
    inline-size: 100%;
    min-block-size: 0;
    padding: var(--space-base-block) var(--space-lg-inline);
    border: 0;
    border-radius: 0;
    background: none;
    color: inherit;
    line-height: var(--line-height-base);
    text-align: start;
    white-space: nowrap;
    transition: background-color 0.25s, color 0.25s;

    &:is(:hover, :focus-visible) {
      outline: none;
      background-color: var(--brand-primary);
      color: var(--color-text-inverse);
    }
  }

  & [role='separator'] {
    margin: 9px 0;
    border-block-start: 1px solid var(--color-menu-divider);
  }
}

/* While the type menu is open, the rest of the box blurs (OG's .blurred). */
.header-search:has(.type-menu:popover-open) :is(input, .autocomplete, .close) {
  background-color: var(--gray-lightish);
  filter: var(--blur-search);
}

.autocomplete {
  position: absolute;
  inset-block-start: 100%;
  inline-size: 100%;
  max-block-size: calc(100vh - var(--header-height));
  overflow-y: auto;
  border-end-start-radius: var(--radius-lg);
  border-end-end-radius: var(--radius-lg);
  background-color: var(--color-box);
  color: var(--color-header-active-text);
  box-shadow: var(--shadow-dropdown);

  &[hidden] {
    display: none;
  }

  & ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  & a {
    color: inherit;
    text-decoration: none;
  }
}

.result a {
  display: grid;
  /* OG held a third, 200px column for the watch-now icons. They're cut, so the title gets the room. */
  grid-template-columns: var(--search-poster-width) 1fr;
  column-gap: var(--space-lg-inline);
  align-items: center;
  padding: 12px var(--space-lg-inline);
  border-block-end: 1px solid var(--color-menu-separator);
  transition: background-color 0.25s;
}

.poster {
  display: block;
  inline-size: var(--search-poster-width);
  aspect-ratio: var(--ratio-poster);
  overflow: hidden;
  border-radius: var(--radius-sm);
  background-color: var(--color-separator);

  & img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  /* A user's avatar: square, and round (OG's .poster.square and [data-type="users"]). */
  &.avatar {
    aspect-ratio: 1;
    border-radius: 50%;
  }
}

.info {
  display: flex;
  flex-direction: column;
  color: var(--color-search-info);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  transition: color 0.5s;
}

.top-title {
  font-size: var(--font-size-small);
  line-height: 1;
  text-transform: uppercase;
}

.title {
  color: var(--color-header-active-text);
  font-weight: var(--font-weight-headings);
  transition: color 0.5s;
}

.tags {
  display: flex;
  gap: var(--space-xs-inline);
  margin: 1px 0 3px;
}

.tag {
  padding: 2px 5px;
  border-radius: var(--radius-search-tag);
  background-color: var(--color-search-tag);
  color: var(--color-text-inverse);
  font-size: var(--font-size-card-tag);
  font-weight: var(--font-weight-headings);
  transition: background-color 0.5s;
}

.type-tag {
  background-color: var(--brand-primary);
}

.genres {
  font-size: var(--font-size-base);
  font-style: italic;
  text-transform: capitalize;
}

.all-results a {
  display: block;
  margin-block-start: 8px;
  padding: var(--space-lg-block) var(--space-lg-inline);
  color: var(--color-search-term);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-light);
  line-height: 1;
  transition: background-color 0.25s;

  & strong {
    font-weight: var(--font-weight-headings-heavy);
  }
}

.term-icon {
  margin-inline-end: 12px;
}

.in-type {
  color: var(--color-search-in-type);
}

.all-results-spacer {
  margin-block-start: 8px;
  border-block-start: 1px solid var(--color-menu-separator);
}

/* The highlighted row, from the arrows or the mouse. */
.selected a {
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);

  & .info {
    color: var(--gray-lightish);
  }

  & .title {
    color: var(--color-text-inverse);
  }

  & .type-tag {
    background-color: var(--brand-primary-darken-20);
  }

  & .in-type {
    color: var(--color-search-in-type-selected);
  }
}

.search-term {
  display: flex;
  align-items: center;
  color: var(--color-search-term);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-light);
  line-height: 1;

  & button {
    min-block-size: 0;
    border: 0;
    border-radius: 0;
    background: none;
    color: inherit;
    font: inherit;
    line-height: inherit;
  }

  &.selected {
    background: var(--brand-primary);
    color: var(--color-text-inverse);

    & .in-type {
      color: var(--color-search-in-type-selected);
    }
  }
}

.reuse-term {
  flex: 1;
  padding: var(--space-lg-block) var(--space-lg-inline);
  text-align: start;
}

.remove-term {
  padding: var(--space-lg-block);
  margin-inline-end: var(--space-base-block);
}

.first-term,
.no-recent {
  margin-block-start: var(--space-search-section);
}

.autocomplete ul:has(.search-term, .no-recent) {
  padding-block-end: var(--space-search-section);
}

.no-recent,
.trending-heading {
  padding: var(--space-lg-block) var(--space-lg-inline);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  line-height: 1;
}

.no-recent {
  color: var(--color-search-term);
  font-weight: var(--font-weight-headings-light);
}

.trending-heading {
  line-height: var(--line-height-headings);
  padding-block-start: calc(var(--space-search-section) + var(--space-lg-block));
  font-weight: var(--font-weight-headings-heavy);
  border-block-start: 1px solid var(--color-menu-separator);
  margin-block-start: var(--space-search-section);
}

/* At 1200px and below OG shrank the field to its magnifier. Focus opens it at full width over the nav. */
@media (width <= 1200px) {
  .header-search {
    position: relative;
    block-size: var(--search-control-height);
  }

  input {
    inline-size: var(--search-collapsed-width);
    min-inline-size: 0;
    padding-inline-end: 0;
    field-sizing: fixed;
  }

  .focused form {
    position: absolute;
    inset-block-start: 0;
    inline-size: var(--search-focused-min-width);
  }
}

/* Phones: a bare magnifier, and focus spreads the field across the bar. */
@media (width < 768px) {
  .header-search:not(.focused) {
    margin-inline-start: calc(-1 * var(--space-sm-inline));
  }

  input {
    background-color: transparent;
  }

  .search-icon {
    inset-inline-start: var(--space-base-inline);
    inset-block-start: calc((var(--search-control-height) - var(--search-icon-size-mobile)) / 2);
    font-size: var(--search-icon-size-mobile);
    line-height: 1;
  }

  .header-search.focused {
    position: fixed;
    inset-block-start: calc((var(--header-height) - var(--search-control-height)) / 2);
    inset-inline: var(--space-search-mobile-inset);
    z-index: var(--z-header);
  }

  .focused form {
    position: relative;
    inline-size: auto;
  }
}
</style>
