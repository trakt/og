<!--
  `/users/:id/history(/:type)` under the profile frame: the subnav with the type, genre
  and date filters, the counter, sort and filter icons, then every play as a poster card under day dividers.
-->
<script lang="ts">
import type { HistoryPlay } from '$lib/components/history/HistoryPlay';
import { removeHistoryCards } from '$lib/users/history/removeHistoryCards';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { page } from '$app/state';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import DateRangeFilter from '$lib/components/filters/DateRangeFilter.svelte';
import DividersToggle from '$lib/components/filters/DividersToggle.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import { type FadeHide, fadeHideOptions, matchesFadeHide } from '$lib/components/filters/fadeHide';
import DayGroup from '$lib/components/history/DayGroup.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import SubnavCount from '$lib/components/toolbar/SubnavCount.svelte';
import WatchNowFilter from '$lib/components/watchnow/WatchNowFilter.svelte';
import check from '$lib/icons/trakt/check.svg?raw';
import documentIcon from '$lib/icons/trakt/document.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { ViewerSettings } from '$lib/settings/ViewerSettings';
import type { ProfileUser } from '$lib/users/ProfileUser';
import { formatRuntime } from '$lib/utils/formatRuntime';
import { genresFor, historyTypes } from './historyTypes.ts';
import type { loadHistory } from './loadHistory.ts';
import type { HistoryCard } from './toHistoryCard.ts';

type Props = {
  data: Awaited<ReturnType<typeof loadHistory>> & {
    profile: ProfileUser;
    isSelf: boolean;
    settings: ViewerSettings | null;
  };
};

const { data }: Props = $props();
let days = $derived(data.days);
// A new loader result clears the journal. It is read when each affected card leaves the grid.
const removal = $derived<{ source: Props['data']; keys: readonly number[] }>({ source: data, keys: [] });
function remove(item: HistoryCard, play?: HistoryPlay) {
  removal.keys = days.flatMap((day) =>
    day.cards.filter((card) => play ? card.key === play.id : card.type === item.type && card.id === item.id).map((
      card,
    ) => card.key)
  );
  days = removeHistoryCards({ days, item, play });
}
const metaType = $derived(data.type === 'all' ? 'TV show and movie' : data.type.replace(/s$/, ''));
const title = $derived(`${data.profile.displayName}'s ${metaType} watched history`);
const genres = $derived(genresFor(data.type));
const base = $derived(`/users/${data.profile.slug}/history`);
const plural = (count: number, word: string) => `${word}${count === 1 ? '' : 's'}`;
const titleCase = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

// OG's `link_params`: the query string without the page, and without the genre when the type changes.
function href(type: string, changes: Record<string, string | null>) {
  const query = new SvelteURLSearchParams(page.url.searchParams);
  query.delete('page');
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) query.delete(key);
    else query.set(key, value);
  }
  return `${base}${type === 'all' ? '' : `/${type}`}${query.size ? `?${query}` : ''}`;
}

let dividers = $derived(data.dividers);
let fadeHide = $derived<FadeHide>(data.fadeHide);
const fadeOptions = $derived(fadeHideOptions.filter((option) => data.type === 'shows' || !('showsOnly' in option)));
const country = $derived(data.settings?.browsing?.watchnow?.country?.toLowerCase() || 'us');
</script>

<!-- Filter URLs keep the canonical profile slug and the query string. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content="Check out what {data.profile.firstName} has been watching recently." />
</svelte:head>

{#snippet card(item: HistoryCard)}
  {@const state = overlay.state(item.type, item.id)}
  {@const fill = quickIconFill({ state, airedEpisodes: item.airedEpisodes, datePreferences: data.datePreferences })}
  <PosterCard
  href={item.href}
  title={item.title}
  number={item.number}
  image={item.image}
  variant={item.variant}
  episodeBadge={item.episodeBadge}
  subtitles={item.show ? [item.show, item.watchedDate] : [item.watchedDate]}
  userRating={state.rating}
  icons={{
        fill,
        rating: item.rating,
        ratingTarget: { type: item.type, id: item.id, title: item.title },
        watchTarget: { type: item.type, id: item.id, title: item.title, airedEpisodes: item.airedEpisodes, season: item.season },
        historyPlay: data.isSelf && item.type !== 'show' ? { id: item.key, watchedAt: item.watchedAt } : undefined,
        onWatchRemove: data.isSelf && item.type !== 'show' ? (play) => remove(item, play) : undefined,
        watchNow: 'play',
        listLabel: item.type === 'episode' ? 'Add to list' : 'Add to watchlist',
      }}
  removing={() => removal.keys.includes(item.key)}
  faded={fadeHide.fade.some((id) => matchesFadeHide(id, state, fill))}
/>
{/snippet}

<SectionToolbar>
  {#snippet filters()}
    <Dropdown>
      {#snippet trigger()}{data.itemTitle ?? historyTypes[data.type]}{/snippet}
      <ul>
        {#each Object.entries(historyTypes) as [type, label] (type)}
          <li><a href={href(type, { genres: null })} aria-current={data.type === type ? 'page' : undefined}>{label}</a></li>
        {/each}
      </ul>
    </Dropdown>
    {#if genres && !data.filters.item}
      <span class="genres">
        <Dropdown>
          {#snippet trigger()}{data.filters.genre ? genres[data.filters.genre] : 'All Genres'}{/snippet}
          <ul class="limit-10">
            <li><a href={href(data.type, { genres: null })} aria-current={data.filters.genre ? undefined : 'page'}
              >All Genres</a></li>
            {#each Object.entries(genres) as [slug, label] (slug)}
              <li><a href={href(data.type, { genres: slug })} aria-current={data.filters.genre === slug ? 'page' : undefined}
                >{label}</a></li>
            {/each}
          </ul>
        </Dropdown>
      </span>
    {/if}
    <DateRangeFilter start={data.filters.startAt} end={data.filters.endAt} label="Watched At"
      datePreferences={data.datePreferences} />
  {/snippet}
  {#snippet summary()}
    <span class="counts">
      {#if data.counts.unique}
        {@const { count, noun } = data.counts.unique}
        <SubnavCount svg={documentIcon} {count} {noun} tooltip={titleCase(`${noun}s`)} />
      {/if}
      {#if data.counts.plays !== undefined}
        <SubnavCount svg={check} count={data.counts.plays} noun="play" tooltip={plural(data.counts.plays, 'Play')} />
      {/if}
    </span>
    <Dropdown>
      {#snippet trigger()}Watched Date{/snippet}
      <ul><li><a href={page.url.pathname + page.url.search} aria-current="page">Watched Date</a></li></ul>
    </Dropdown>
    <span class="icons">
      <DividersToggle bind:shown={dividers} />
      <WatchNowFilter value={data.filters.watchnow} {country}
        favorites={data.settings?.browsing?.watchnow?.favorites ?? []} placeholder={data.type === 'all'} />
      <FadeHideMenu value={fadeHide} options={fadeOptions} cookie="history" hideOptions={[]} variant="default"
        onchange={(next) => (fadeHide = next)} />
    </span>
  {/snippet}
</SectionToolbar>

<section class="history" aria-label={title}>
  <Container>
    {#if days.length > 0}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="History pages" />{/if}
      {#each days as day (day.key)}
        <DayGroup weekday={day.weekday} date={day.date} divider={dividers}
          runtime={data.type === 'shows' ? undefined : formatRuntime(day.runtime)}>
          <PosterGrid columns={data.screenshots ? 4 : 6}>
            {#each day.cards as item (item.key)}{@render card(item)}{/each}
          </PosterGrid>
        </DayGroup>
      {/each}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="History pages" />{/if}
    {:else}
      <div class="empty"><NoData /></div>
    {/if}
  </Container>
</section>

<style>
.counts {
  display: flex;
  gap: var(--history-count-gap);
}

.icons {
  display: flex;
  align-items: center;
  gap: var(--history-icon-gap);
}

.limit-10 {
  max-block-size: var(--dropdown-limit-10-height);
  overflow-y: auto;
}

.history {
  display: flow-root;
  padding-block-end: var(--space-panel);

  /* The top pagination spacing: 20px above, the divider's own 20px below. */
  & :global(nav) {
    margin-block: var(--line-height-computed) var(--history-pagination-end);
  }
}

.empty {
  padding-block-start: var(--line-height-computed);
}

@media (width < 768px) {
  .counts {
    display: none;
  }
}
</style>
