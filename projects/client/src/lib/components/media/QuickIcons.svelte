<!--
  OG's quick-icon bar under a poster or fanart card: watch, library, list, optional favorite, watch now and hide on
  the left, the Trakt rating on the right. Watch, rating and favorites use shared browser controls.
-->
<script lang="ts">
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import { page } from '$app/state';
import Spinner from '$lib/components/loading/Spinner.svelte';
import MediaFavorite from '$lib/components/favorites/MediaFavorite.svelte';
import type { FavoriteTarget } from '$lib/favorites/FavoriteTarget';
import MediaRating from '$lib/components/rating/MediaRating.svelte';
import MediaCollection from '$lib/components/collection/MediaCollection.svelte';
import MediaWatch from '$lib/components/history/MediaWatch.svelte';
import type { HistoryPlay } from '$lib/components/history/HistoryPlay';
import type { WatchTarget } from '$lib/components/history/WatchTarget';
import type { RatingTarget } from '$lib/components/rating/RatingTarget';
import MediaList from '$lib/components/lists/MediaList.svelte';
import type { ListTarget } from '$lib/components/lists/ListTarget';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import ban from '$lib/icons/regular/ban.svg?raw';
import minus from '$lib/icons/regular/circle-minus.svg?raw';
import VisibilityControl from '$lib/components/visibility/VisibilityControl.svelte';
import type { VisibilityTarget } from '$lib/components/visibility/VisibilityTarget';
import backward from '$lib/icons/solid/backward.svg?raw';
import heart from '$lib/icons/solid/heart.svg?raw';
import play from '$lib/icons/solid/play.svg?raw';
import star from '$lib/icons/solid/star.svg?raw';
import ticket from '$lib/icons/solid/ticket.svg?raw';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import collection from '$lib/icons/trakt/collection-thick.svg?raw';
import list from '$lib/icons/trakt/list-thick.svg?raw';
import type { QuickIconFill } from './quickIconFill.ts';

interface Props {
  fill: QuickIconFill;
  /** The Trakt rating, 0 to 10. Left out, no percentage shows. */
  rating?: number;
  /** False for future or undated items; early-ratings preferences can override it. */
  released?: boolean;
  ratingTarget?: RatingTarget;
  watchTarget?: WatchTarget;
  collectionTarget?: WatchTarget;
  historyPlay?: HistoryPlay;
  onWatchRemove?: (play?: HistoryPlay) => void;
  onWatchSave?: (watchedAt: string | null) => void;
  onCollectionRemove?: () => void;
  onCollectionSave?: (collectedAt: string | null | undefined) => void;
  listTarget?: ListTarget;
  /** Poster cards use the 35px bar; fanart cards the 40px one. */
  small?: boolean;
  /** Tight text-card actions, like OG calendar schedules. */
  compact?: boolean;
  /** Only where OG turned it on (charts). */
  favorite?: boolean;
  /** For season/episode stars, pass the parent show. */
  favoriteTarget?: FavoriteTarget;
  /** `cinema` swaps the play icon for a ticket, for movies only in cinemas. Left out, no watch-now icon. */
  watchNow?: 'play' | 'cinema';
  /** Names the thing being hidden ("show", "movie"). Left out, no hide icon. */
  hide?: string;
  hideTarget?: VisibilityTarget;
  hideSection?: 'calendar' | 'recommendations' | 'progress_watched' | 'progress_collected' | 'dropped';
  /** "Add to watchlist" on movies and shows; "Add to list" on seasons, episodes and people. */
  listLabel?: string;
  /** People: only the list icon, since they can't be watched or collected. */
  listOnly?: boolean;
}

const {
  fill,
  rating,
  released,
  ratingTarget,
  watchTarget,
  collectionTarget,
  historyPlay,
  onWatchRemove,
  onWatchSave,
  onCollectionRemove,
  onCollectionSave,
  listTarget,
  small = false,
  compact = false,
  favorite = false,
  favoriteTarget,
  watchNow,
  hide,
  hideTarget,
  hideSection = 'recommendations',
  listLabel = 'Add to watchlist',
  listOnly = false,
}: Props = $props();

const target = $derived(
  favoriteTarget ??
    (ratingTarget?.type === 'movie' || ratingTarget?.type === 'show'
      ? { ...ratingTarget, type: ratingTarget.type }
      : undefined),
);
const hiddenTarget = $derived(
  hideTarget ??
    (ratingTarget?.type === 'movie' || ratingTarget?.type === 'show' || ratingTarget?.type === 'season'
      ? { ...ratingTarget, type: ratingTarget.type }
      : undefined),
);
const targetList = $derived(listTarget ?? ratingTarget);

// API: integer rating, so 7.9 is still rating-7. OG had no rating-0 color and fell back to rating-1's gray.
const historyTarget = $derived(watchTarget ?? ratingTarget);
const libraryTarget = $derived(collectionTarget ?? historyTarget);
const ratingLevel = $derived(rating === undefined ? 1 : Math.min(Math.max(Math.trunc(rating), 1), 10));
</script>

<!-- `label` names the action; `title` is the tooltip, which says what's done once it is. -->
{#snippet action(kind: string, svg: string, label: string, amount: number, title = label)}
  <Tooltip text={title} placement="bottom">
    {#snippet trigger(tooltip)}
      <button
        type="button"
        class={['action', kind, { selected: amount > 0 }]}
        style:--fill={amount}
        aria-label={label}
        {...tooltip}
      >
        <span class="base"></span>
        <Icon {svg} />
      </button>
    {/snippet}
  </Tooltip>
{/snippet}

<div class={['quick-icons', { small, compact }]}>
  <div class="actions">
    {#if !listOnly}
    {#if historyTarget}
      <MediaWatch target={historyTarget} play={historyPlay} onremove={onWatchRemove} onsave={onWatchSave} {small} />
    {:else}
    {@render action(
      fill.rewatching ? 'watch rewatching' : 'watch',
      fill.rewatching ? backward : check,
      'Add to watched history',
      fill.watched,
      fill.titles.watched,
    )}
    {/if}
    {#if libraryTarget}<MediaCollection target={libraryTarget} onremove={onCollectionRemove} onsave={onCollectionSave} {small} />{:else}{@render action('collect', collection, 'Add to library', fill.collected, fill.titles.collected)}{/if}
    {/if}
    {#if targetList}
      <MediaList target={targetList} {small} />
    {:else}
      {@render action('list', list, listLabel, fill.listed ? 1 : 0, fill.titles.listed)}
    {/if}
    {#if favorite}
      {#if target}
        <MediaFavorite {target}>
          {#snippet trigger({ selected, date, busy, toggle })}
            <Tooltip text={selected ? date ? `Favorited on\n${date}` : 'Favorited' : 'Add to favorites'} placement="bottom">
              {#snippet trigger(tooltip)}
                <button type="button" class={['action', 'favorite', { selected }]} style:--fill={selected ? 1 : 0} aria-label={selected ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={selected} aria-busy={busy} aria-disabled={busy} onclick={toggle} {...tooltip}>
                  <span class="base"></span>{#if busy}<Spinner label="Saving favorite" />{:else}<Icon svg={star} />{/if}
                </button>
              {/snippet}
            </Tooltip>
          {/snippet}
        </MediaFavorite>
      {:else}
        {@render action('favorite', star, 'Add to favorites', fill.favorited ? 1 : 0, fill.titles.favorited)}
      {/if}
    {/if}
    {#if watchNow}
      {@render action('watch-now', watchNow === 'cinema' ? ticket : play, 'Watch now', 0)}
    {/if}
    {#if hide}
      {#if hiddenTarget}
        <VisibilityControl target={hiddenTarget} action={hideSection === 'dropped' ? 'drop' : 'hide'} section={hideSection === 'dropped' ? undefined : hideSection} variant="card" {small}><span class:ban={hideSection !== 'dropped'}><Icon svg={hideSection === 'dropped' ? minus : ban} /></span></VisibilityControl>
      {:else}{@render action('ignore', ban, `Hide this ${hide}`, 0)}{/if}
    {/if}
  </div>
  {#if rating !== undefined && (released !== false || page.data.settings?.browsing?.display_early_ratings)}
    <MediaSpoiler target={watchTarget ?? collectionTarget ?? ratingTarget} kind="rating">
    {#if ratingTarget}
      <MediaRating target={ratingTarget}>
        {#snippet trigger()}
          <span class="percentage"><span class="heart" style:color="var(--rating-{ratingLevel})"><Icon svg={heart} /></span>{Math.trunc(rating * 10)}%</span>
        {/snippet}
      </MediaRating>
    {:else}
      <p class="percentage"><span class="heart" style:color="var(--rating-{ratingLevel})"><Icon svg={heart} /></span>{Math.trunc(rating * 10)}%</p>
    {/if}
    </MediaSpoiler>
  {/if}
</div>

<style>
.quick-icons {
  --bar: 40px;
  --action-width: 35px;
  display: flex;
  justify-content: space-between;
  block-size: var(--bar);
  overflow: hidden;
  white-space: nowrap;
  background-color: var(--color-card-bg);
  color: var(--color-card-text);

  &.small {
    --bar: 35px;
    --action-width: 28px;
  }
}

.quick-icons.compact {
  --bar: var(--quick-icons-compact-height);
  --action-width: var(--quick-icons-compact-width);
  --watch-card-small-height: var(--quick-icons-compact-height);
  --watch-card-small-width: var(--quick-icons-compact-width);
  --list-card-small-height: var(--quick-icons-compact-height);
  --list-card-small-width: var(--quick-icons-compact-width);
  --font-size-quick-icon-small: var(--quick-icons-compact-size);
  & .action {
    font-size: var(--quick-icons-compact-size);
  }
}
.actions {
  display: flex;
}

.action {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: var(--action-width);
  block-size: var(--bar);
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color);
  font-size: var(--font-size-quick-icon);
  line-height: 1;
  cursor: pointer;

  .small & {
    block-size: calc(var(--bar) - 1px);
    font-size: var(--font-size-quick-icon-small);
  }

  /* The coloured layer behind the glyph. Shows and seasons fill it partway, as opacity. */
  .base {
    position: absolute;
    inset: 0;
    background-color: var(--color);
    opacity: 0;
    transition: opacity var(--transition-card);
  }

  & :global(.icon) {
    position: relative;
  }

  &:is(:hover, :focus-visible, .selected) {
    color: var(--color-card-text);
  }

  &.selected .base {
    opacity: var(--fill);
  }

  &:is(:hover, :focus-visible) .base {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--color-card-text);
    outline-offset: -2px;
  }
}

.watch {
  --color: var(--brand-tertiary);
}

.rewatching :global(.icon) {
  font-size: 0.9em;
}

.collect {
  --color: var(--brand-quaternary);
}

.list {
  --color: var(--brand-fifth);
}

.favorite {
  --color: var(--brand-seventh);
}

.ban {
  rotate: 90deg;
}

.ignore {
  --color: var(--gray);
}

.watch-now {
  --color: var(--gray);
  color: var(--color-watch-now);
  font-size: calc(var(--font-size-quick-icon) * 15 / 17); /* 1.5em */
}

.percentage {
  margin: 0;
  padding-inline-end: 10px;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  font-size: var(--font-size-rating);
  line-height: var(--bar);

  .small & {
    padding-inline-end: 5px;
    font-size: var(--font-size-rating-small);
    line-height: calc(var(--bar) - 1px);
  }
}

.heart {
  margin-inline-end: 5px;
  font-size: var(--font-size-rating-heart);

  .small & {
    margin-inline-end: 4px;
    font-size: var(--font-size-rating-small);
  }
}

@media (prefers-reduced-motion: reduce) {
  .action .base {
    transition: none;
  }
}
</style>
