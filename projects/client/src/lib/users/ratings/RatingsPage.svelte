<script lang="ts">
import { SvelteURLSearchParams } from 'svelte/reactivity';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import Container from '$lib/components/container/Container.svelte';
import Dropdown from '$lib/components/dropdown/Dropdown.svelte';
import SortDirection from '$lib/components/dropdown/SortDirection.svelte';
import NoData from '$lib/components/empty/NoData.svelte';
import DividersToggle from '$lib/components/filters/DividersToggle.svelte';
import FadeHideMenu from '$lib/components/filters/FadeHideMenu.svelte';
import { type FadeHide, fadeHideOptions, matchesFadeHide } from '$lib/components/filters/fadeHide';
import DayGroup from '$lib/components/history/DayGroup.svelte';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import PosterGrid from '$lib/components/media/PosterGrid.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import Pagination from '$lib/components/pagination/Pagination.svelte';
import RatingLine from '$lib/components/rating/RatingLine.svelte';
import { RATING_LABELS } from '$lib/components/rating/ratingPrompt';
import SectionToolbar from '$lib/components/toolbar/SectionToolbar.svelte';
import SubnavCount from '$lib/components/toolbar/SubnavCount.svelte';
import documentIcon from '$lib/icons/trakt/document.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { ProfileUser } from '$lib/users/ProfileUser';
import { toHistoryDays } from '$lib/users/history/toHistoryCard';
import type { loadRatings } from '$lib/users/ratings/loadRatings';
import type { RatingCard } from '$lib/users/ratings/RatingCard';
import { ratingQuery } from '$lib/users/ratings/ratingQuery';
import { ratingSorts } from '$lib/users/ratings/ratingSorts';
import { ratingTypes } from '$lib/users/ratings/ratingTypes';

const { data }: { data: Awaited<ReturnType<typeof loadRatings>> & { profile: ProfileUser } } = $props();
const title = $derived(
  `${data.profile.displayName}'s ${data.query.type === 'all' ? '' : data.query.type.replace(/s$/, '') + ' '}ratings`,
);
const noun = $derived(data.query.type === 'all' ? 'item' : data.query.type.replace(/s$/, ''));
const screenshots = $derived(data.query.type === 'episodes');
let dividers = $derived(data.dividers);
let fadeHide = $derived<FadeHide>(data.fadeHide);
const fadeOptions = $derived(
  fadeHideOptions.filter((option) => ['all', 'shows', 'seasons'].includes(data.query.type) || !('showsOnly' in option)),
);
const sorts = $derived(ratingSorts[data.query.type]);
const sortLabel = $derived(Object.entries(sorts).find(([by]) => by === data.query.by)?.at(1));
const flipped = $derived(data.query.how === 'desc');

function href(next: Partial<ReturnType<typeof ratingQuery>>) {
  const query = ratingQuery(
    [
      next.type ?? data.query.type,
      next.rating ?? data.query.rating,
      next.by ?? data.query.by,
      next.how ?? data.query.how,
    ].join('/'),
  );
  const search = new SvelteURLSearchParams(page.url.searchParams);
  search.delete('page');
  const sorted = query.by !== 'added' || query.how !== 'asc';
  const path = sorted
    ? `/${query.type}/${query.rating}/${query.by}/${query.how}`
    : query.rating !== 'all'
    ? `/${query.type}/${query.rating}`
    : query.type === 'all'
    ? ''
    : `/${query.type}`;
  return `/users/${data.profile.slug}/ratings${path}${search.size ? `?${search}` : ''}`;
}

// The profile owner's caption is separate from the viewer's corner badge. Reuse the rating widget's optimistic
// overlay for the owner's live changes; another user's caption never follows the viewer's rating.
function ownerRating(item: RatingCard) {
  if (!data.isSelf) return item.ownerRating;
  const viewerRating = overlay.state(item.type, item.id).rating;
  return viewerRating === undefined ? item.ownerRating : viewerRating;
}
const cards = $derived(data.cards.filter((item) => {
  const rating = ownerRating(item);
  return rating !== null && (data.query.rating === 'all' || String(rating) === data.query.rating);
}));
const days = $derived(
  cards.length === data.cards.length
    ? data.days
    : data.query.by === 'added'
    ? toHistoryDays(cards, data.datePreferences)
    : [],
);
const count = $derived(data.total - (data.cards.length - cards.length));
</script>

<!-- Canonical profile links retain the query string and OG's path sort segments. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
  <title>{title} - Trakt</title>
  <meta name="description" content="Check out what {data.profile.firstName} has been rating recently." />
</svelte:head>

{#snippet card(item: RatingCard)}
  {@const state = overlay.state(item.type, item.id, item.seasonOf)}
  {@const fill = quickIconFill({ state, airedEpisodes: item.airedEpisodes, datePreferences: data.datePreferences })}
  {@const rating = ownerRating(item)}
  <PosterCard href={item.href} title={item.title} number={item.number} image={item.image} variant={item.variant}
  episodeBadge={item.episodeBadge} subtitles={item.subtitles} userRating={state.rating}
  icons={{ fill, rating: item.rating,
      ratingTarget: { type: item.type, id: item.id, title: item.title },
      watchTarget: { type: item.type, id: item.id, title: item.title, airedEpisodes: item.airedEpisodes },
      watchNow: item.type === 'season' ? undefined : 'play', listLabel: item.type === 'episode' || item.type === 'season' ? 'Add to list' : 'Add to watchlist' }}
  faded={fadeHide.fade.some((id) => matchesFadeHide(id, state, fill))}>
    {#if rating !== null}<a class="rating-link" href={item.href}><RatingLine {rating} /></a>{/if}
  </PosterCard>
{/snippet}
{#snippet grid(items: readonly RatingCard[])}
  <PosterGrid columns={screenshots ? 4 : 6}>
    {#each items as item (item.key)}{@render card(item)}{/each}
  </PosterGrid>
{/snippet}

<SectionToolbar>
  {#snippet filters()}
    <Dropdown>
      {#snippet trigger()}{ratingTypes[data.query.type]}{/snippet}
      <ul>{#each Object.entries(ratingTypes) as [type, label] (type)}
        <li><a href={href({ type: ratingQuery(type).type })} aria-current={data.query.type === type ? 'page' : undefined}>{label}</a></li>
      {/each}</ul>
    </Dropdown>
  {/snippet}
  {#snippet summary()}
    <SubnavCount svg={documentIcon} {count} {noun} tooltip={`${noun.charAt(0).toUpperCase()}${noun.slice(1)}s`} />
    <Dropdown>
      {#snippet trigger()}{data.query.rating === 'all' ? 'All Ratings' : `${data.query.rating} - ${RATING_LABELS[Number(data.query.rating)]}`}{/snippet}
      <ul>
        <li><a href={href({ rating: 'all' })} aria-current={data.query.rating === 'all' ? 'page' : undefined}>All Ratings</a></li>
        {#each Array.from({ length: 10 }, (_, i) => 10 - i) as rating (rating)}
          <li><a href={href({ rating: String(rating) })} aria-current={data.query.rating === String(rating) ? 'page' : undefined}>{rating} - {RATING_LABELS[rating]}</a></li>
        {/each}
      </ul>
    </Dropdown>
    <span class="sort">
      <Dropdown>
        {#snippet trigger()}{sortLabel}{/snippet}
        <ul>{#each Object.entries(sorts) as [by, label] (by)}
          <li><a href={href({ by: ratingQuery(`${data.query.type}/all/${by}`).by })} aria-current={data.query.by === by ? 'page' : undefined}>{label}</a></li>
        {/each}</ul>
      </Dropdown>
      <SortDirection bind:flipped={() => flipped, (next) => goto(href({ how: next ? 'desc' : 'asc' }))} />
    </span>
    <span class="icons">
      {#if data.query.by === 'added'}<DividersToggle bind:shown={dividers} />{/if}
      <FadeHideMenu value={fadeHide} options={fadeOptions} cookie="ratings" hideOptions={[]} variant="default" onchange={(next) => (fadeHide = next)} />
    </span>
  {/snippet}
</SectionToolbar>

<section class="ratings" aria-label={title}>
  <Container>
    {#if cards.length > 0}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="Ratings pages" />{/if}
      {#if days.length > 0 && dividers}
        {#each days as day (day.key)}<DayGroup weekday={day.weekday} date={day.date}>{@render grid(day.cards)}</DayGroup>{/each}
      {:else}
        {@render grid(cards)}
      {/if}
      {#if data.page.type === 'paginated'}<Pagination meta={data.page} label="Ratings pages" />{/if}
    {:else}
      <div class="empty"><NoData /></div>
    {/if}
  </Container>
</section>
<style>
.sort,
.icons {
  display: flex;
  align-items: center;
}
.icons {
  gap: var(--history-icon-gap);
}
.ratings {
  display: flow-root;
  padding-block-end: var(--space-panel);
  & :global(nav) {
    margin-block: var(--line-height-computed) var(--history-pagination-end);
  }
}
.empty {
  padding-block-start: var(--line-height-computed);
}
.rating-link {
  display: block;
  color: inherit;
  text-decoration: none;
}
.rating-link:is(:hover, :focus-visible) {
  text-decoration: underline;
}
</style>
