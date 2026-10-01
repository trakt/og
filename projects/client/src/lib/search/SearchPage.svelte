<!--
  The search results page: the Frame sidebar with the result count, the v3 note and the type
  nav, then the card grid in the viewer's search image type, list rows on the Lists tab or avatar cards on the Users
  tab, and the bottom pagination.
  The frame is dark in every theme, which covers OG's forced dark knight.
-->
<script lang="ts">
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import defaultCover from '$lib/assets/profile-cover-default.jpg';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import { type FadeHide, matchesFadeHide } from '$lib/components/filters/fadeHide';
import { searchHideHref } from '$lib/search/searchHideHref';
import Frame from '$lib/components/frame/Frame.svelte';
import FrameGrid from '$lib/components/frame/FrameGrid.svelte';
import FrameNav from '$lib/components/frame/FrameNav.svelte';
import FanartCard from '$lib/components/media/FanartCard.svelte';
import ListRow from '$lib/components/media/ListRow.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import NoResults from '$lib/components/empty/NoResults.svelte';
import PageNav from '$lib/components/pagination/PageNav.svelte';
import { pageHref } from '$lib/components/pagination/pageWindow';
import { overlay } from '$lib/overlay/overlay';
import { findSearchType } from '$lib/search/findSearchType';
import { searchLinks } from '$lib/search/searchLinks';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import type { loadSearch } from '$lib/search/loadSearch';

type Props = {
  data: Awaited<ReturnType<typeof loadSearch>> & { datePreferences: DatePreferences };
};

const { data }: Props = $props();

// The small-screen "Search Terms" field. The type links carry whatever is typed there (search.js:1-14).
let terms = $derived(data.query);

const type = $derived(findSearchType(data.slug));
const links = $derived(type ? searchLinks(type, terms.trim(), page.url.searchParams) : []);

// OG named the tab by its model: Show, Movie, Person...
const META_TYPES: Readonly<Record<string, string>> = {
  shows: 'Show',
  movies: 'Movie',
  episodes: 'Episode',
  people: 'Person',
  lists: 'List',
  users: 'User',
};
const metaType = $derived(META_TYPES[data.slug]);
const meta = $derived(
  metaType
    ? {
      title: `${metaType} search results for ${data.query}`,
      description: `${metaType} search results for movies, TV shows, episodes, lists, and people.`,
    }
    : { title: `Search results for ${data.query}`, description: 'Search results for movies and TV shows.' },
);

const prevHref = $derived(data.page.current > 1 ? pageHref(page.url, data.page.current - 1) : undefined);
const nextHref = $derived(
  data.page.type === 'paginated' && data.page.current < data.page.total
    ? pageHref(page.url, data.page.current + 1)
    : undefined,
);
// posters and banners get their own columns, the other image types the fanart ones.
const gridVariant = $derived(
  data.imageType === 'poster' || data.imageType === 'banner' ? data.imageType : 'uniform',
);
const cardVariant = $derived(
  data.imageType === 'poster' || data.imageType === 'banner' ? data.imageType : 'fanart',
);
const hasResults = $derived(data.cards.length > 0 || data.lists.length > 0 || data.users.length > 0);
let fadeHide = $derived(data.filters.fadeHide);

function save(next: FadeHide) {
  const reload = fadeHide.hide.join(',') !== next.hide.join(',');
  fadeHide = next;
  if (reload) {
    // The URL is built from the current route and preserves the user's query.
    goto(resolve(searchHideHref(page.url, next.hide) as `/search${string}`), { keepFocus: true, noScroll: true });
  }
}
</script>

<svelte:head>
  <title>{meta.title.trim()} - Trakt</title>
  <meta name="description" content={meta.description} />
</svelte:head>

<!-- The v3 link is another site, which resolve() doesn't cover. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<Frame title="Search" {prevHref} {nextHref}>
  {#snippet icons()}
    {#if data.filters.visible}
      <FadeHideMenu value={fadeHide} options={data.filters.options} hideOptions={data.filters.hideOptions}
        cookie="search" onchange={save} />
    {/if}
  {/snippet}
  {#snippet subtitle()}
    We found <strong>{data.count.toLocaleString('en-US')}{data.countCapped ? '+' : ''}</strong> results{data.query ? ' for ' : ''}{#if data.query}{data.idMode ? 'ID ' : ''}<strong
      >{data.query}</strong
      >{/if}.
    {#if data.page.type === 'paginated' && data.page.total > 1}
      You're viewing page <strong>{data.page.current.toLocaleString('en-US')}</strong> of
      <strong>{data.page.total.toLocaleString('en-US')}</strong>.
    {/if}
  {/snippet}

  {#snippet sidebar()}
    {#if data.query}
      <p class="v3-note">
        Want better search results?
        <a href="https://app.trakt.tv/search?q={encodeURIComponent(data.query)}" target="_blank" rel="noopener">
          View this search on the new Trakt →</a>
      </p>
    {/if}
    <form class="terms" action={page.url.pathname} method="get">
      <label for="search-terms">{data.idMode ? 'Search ID' : 'Search Terms'}</label>
      <input id="search-terms" type="search" name="query" placeholder="What are you looking for?" bind:value={terms} />
    </form>
    <FrameNav heading="Trakt" {links} />
  {/snippet}

  {#if data.users.length > 0}
    <!-- OG hid the quick icons on user cards. -->
    <FrameGrid variant="uniform">
      {#each data.users as user (user.key)}
        <FanartCard href={user.href} title={user.title} image={user.cover ?? defaultCover} avatar={user.avatar}
          tags={user.tags} />
      {/each}
    </FrameGrid>
  {:else if data.lists.length > 0}
    <div class="lists">
      {#each data.lists as list (list.key)}
        <ListRow {...list} likeTarget={{ id: list.id, ownerSlug: list.kind === 'personal' ? list.owner.slug : undefined, viewer: page.data.user?.slug ?? null }} />
      {/each}
    </div>
  {:else if data.cards.length > 0}
    <FrameGrid variant={gridVariant}>
      {#each data.cards as card (card.key)}
        {@const state = card.type === 'person' ? undefined : overlay.state(card.type, card.id, card.season)}
        {@const fill = quickIconFill({ state: state ?? {}, airedEpisodes: card.airedEpisodes, datePreferences: data.datePreferences })}
        {#if !state || !fadeHide.hide.some((id) => matchesFadeHide(id, state, fill))}
        <FanartCard
          variant={cardVariant}
          href={card.href}
          title={card.title}
          year={card.year}
          smallTitle={card.smallTitle}
          image={card.image}
          logo={card.logo}
          logoMode={card.logoMode}
          tags={card.tags}
          hideTitle={card.hideTitle}
          episodeBadge={card.episodeBadge}
          userRating={state?.rating}
          dropped={state?.dropped}
          faded={Boolean(state && fadeHide.fade.some((id) => matchesFadeHide(id, state, fill)))}
          icons={state && card.type !== 'person'
          ? {
            fill,
            ratingTarget: { type: card.type, id: card.id, title: card.title },
            watchTarget: { type: card.type, id: card.id, title: card.title, airedEpisodes: card.airedEpisodes, runtime: card.runtime, season: card.season },
            rating: card.released ? card.rating : undefined,
            // ponytail: like the charts, an item that isn't out yet is taken to have no sources until #60.
            watchNow: card.released ? 'play' : undefined,
            listLabel: card.type === 'episode' ? 'Add to list' : undefined,
          }
          : {
            // The overlay has no people yet, so their list icon starts empty.
            fill: quickIconFill({ state: {} }),
            listOnly: true,
            listTarget: { type: 'person', id: card.id, title: card.title },
            listLabel: 'Add to list',
          }}
        />
        {/if}
      {/each}
    </FrameGrid>
  {/if}

  {#if hasResults}
    <div class="page-nav">
      <PageNav {prevHref} {nextHref} />
    </div>
  {:else}
    <div class="no-results">
      <NoResults />
    </div>
  {/if}
</Frame>

<style>
.v3-note {
  margin: 0;
}

/* OG only showed its own search field below 1200px (`visible-xs visible-sm visible-md`). */
.terms {
  margin-block-start: var(--sidenav-nav-gap);

  @media (min-width: 1200px) {
    display: none;
  }

  & label {
    display: block;
    margin-block-end: var(--space-sm-block);
    font-family: var(--font-headings);
    font-size: var(--font-size-h4);
  }

  & input {
    inline-size: 100%;
  }
}

.page-nav:has(:global(nav)) {
  border-block-end: 1px solid var(--color-frame-border);
}

.no-results {
  display: grid;
  place-items: center;
  min-block-size: calc(100vh - var(--header-height));
}
</style>
