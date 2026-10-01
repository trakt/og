<!--
  The button stack to the right of a summary's overview , in its idle
  state: check in, history, library, watchlist, favorites, comment. History and favorites use shared optimistic
  controls. The phone Watch Now button sits above them (`WatchNow` with `phone`).
-->
<script lang="ts">
import { page } from '$app/state';
import Spinner from '$lib/components/loading/Spinner.svelte';
import { checkin as checkinModal } from '$lib/components/checkin/checkin.svelte';
import type { CheckinTarget } from '$lib/components/checkin/CheckinTarget';
import { newComment } from '$lib/components/comments/newComment.svelte';
import MediaFavorite from '$lib/components/favorites/MediaFavorite.svelte';
import type { FavoriteTarget } from '$lib/favorites/FavoriteTarget';
import MediaCollection from '$lib/components/collection/MediaCollection.svelte';
import MediaWatch from '$lib/components/history/MediaWatch.svelte';
import type { WatchTarget } from '$lib/components/history/WatchTarget';
import MediaList from '$lib/components/lists/MediaList.svelte';
import type { ListTarget } from '$lib/components/lists/ListTarget';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import circlePlus from '$lib/icons/light/circle-plus.svg?raw';
import star from '$lib/icons/thin/star.svg?raw';
import filledStar from '$lib/icons/solid/star.svg?raw';
import check from '$lib/icons/trakt/check.svg?raw';
import collection from '$lib/icons/trakt/collection.svg?raw';
import comment from '$lib/icons/trakt/comment.svg?raw';
import list from '$lib/icons/trakt/list.svg?raw';
import trakt from '$lib/icons/trakt/trakt.svg?raw';

interface Props {
  /** Movies and episodes. */
  checkin?: Pick<CheckinTarget, 'type' | 'id'>;
  /** Movies and shows. */
  favorites?: boolean;
  favoriteTarget?: FavoriteTarget;
  comment?: boolean;
  /** Off on person pages, which had progress buttons in their place. */
  history?: boolean;
  historyTarget?: WatchTarget;
  library?: boolean;
  /** Read-only progress on person credits, counting complete visible items. */
  progress?: { watched: number; collected: number; visible: number; total: number };
  /** "Add to list" on person pages. */
  listLabel?: string;
  listTarget?: ListTarget;
}

const {
  checkin,
  favorites = false,
  favoriteTarget,
  comment: commentable = true,
  history = true,
  historyTarget,
  library = true,
  progress,
  listLabel = 'Add to watchlist',
  listTarget,
}: Props = $props();

let opening = $state(false);
async function openCheckin(item: Pick<CheckinTarget, 'type' | 'id'>) {
  if (opening) return;
  opening = true;
  await checkinModal.open(item).finally(() => (opening = false));
}

// Logged out, "Add comment" signs in and comes back. Banned from commenting, it's gone (the page has no form).
const signIn = $derived(`/auth/signin?${new URLSearchParams({ redirect_to: page.url.pathname })}`);

const buttons = $derived(
  [
    checkin !== undefined && { kind: 'checkin', icon: trakt, label: 'Check In' },
    history && { kind: 'watch', icon: check, label: 'Add to history', side: 'Add additional play' },
    library && { kind: 'collect', icon: collection, label: 'Add to library', side: 'Add to library' },
    { kind: 'list', icon: list, label: listLabel, side: 'Add to list' },
    favorites && { kind: 'favorites', icon: star, label: 'Add to favorites' },
    commentable && { kind: 'comment', icon: comment, label: 'Add comment' },
  ].filter((button) => button !== false),
);
</script>

<div class="action-buttons">
  {#if progress}
    {#each [['watch', check, progress.watched, 'watched'], ['collect', collection, progress.collected, 'in library']] as const as [kind, icon, count, label] (kind)}
      <div class={['action', kind, 'progress', { selected: count > 0 }]}>
        <span class="icon"><Icon svg={icon} fixedWidth /></span>
        <span class="text"><span class="main-info">{progress.visible ? Math.trunc(count / progress.visible * 100) : 0}% {label}</span><span class="under-info">{count}/{progress.total} {progress.total === 1 ? 'item' : 'items'}</span></span>
      </div>
    {/each}
  {/if}
  {#each buttons as { kind, icon, label, side } (kind)}
    {#if kind === 'watch' && historyTarget}
      <div class="history-action"><MediaWatch target={historyTarget} variant="summary" /></div>
    {:else if kind === 'collect' && historyTarget}
      <MediaCollection target={historyTarget} variant="summary" />
    {:else if kind === 'list' && listTarget}
      <MediaList target={listTarget} variant="summary" />
    {:else if kind === 'favorites' && favoriteTarget}
      <MediaFavorite target={favoriteTarget}>
        {#snippet trigger({ selected, date, busy, toggle })}
          <button type="button" class={['action', kind, { selected }]} aria-pressed={selected} aria-label={selected ? 'Remove from favorites' : label} aria-busy={busy} aria-disabled={busy} onclick={toggle}>
            <span class="icon"><Icon svg={selected ? filledStar : icon} fixedWidth /></span>
            <span class="text"><span class="main-info">{selected ? date ? 'Favorited on' : 'Favorited' : label}</span>{#if selected && date}<span class="under-info">{date}</span>{/if}</span>
            {#if busy}<span class="loading"><Spinner label="Saving favorite" /></span>{/if}
          </button>
        {/snippet}
      </MediaFavorite>
    {:else if kind === 'checkin' && checkin}
      <button type="button" class={['action', kind]} aria-haspopup="dialog" aria-busy={opening} onclick={() => openCheckin(checkin)}>
        <span class="icon"><Icon svg={icon} fixedWidth /></span>
        <span class="main-info">{label}</span>
        {#if opening}<span class="loading"><Spinner label="Opening check in" /></span>{/if}
      </button>
    {:else if kind === 'comment'}
      {#if !page.data.settings}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- sign-in with a return-to query -->
        <a class={['action', kind]} href={signIn}>
          <span class="icon"><Icon svg={icon} fixedWidth /></span>
          <span class="main-info">{label}</span>
        </a>
      {:else if page.data.settings.permissions?.commenting}
        <button type="button" class={['action', kind]} aria-controls="new-comment" onclick={() => newComment.open()}>
          <span class="icon"><Icon svg={icon} fixedWidth /></span>
          <span class="main-info">{label}</span>
        </button>
      {/if}
    {:else}
      <button type="button" class={['action', kind]} aria-disabled="true">

      <span class="icon"><Icon svg={icon} fixedWidth /></span>
      <span class="main-info">{label}</span>
      {#if side}
        <Tooltip text={side} placement="right">
          {#snippet trigger(tooltip)}<span class="side" {...tooltip}><Icon svg={circlePlus} /></span>{/snippet}
        </Tooltip>
      {/if}
    </button>
    {/if}
  {/each}
</div>

<style>
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs-inline);
}
.action {
  --action-color: var(--brand-tertiary);
  position: relative;
  display: flex;
  align-items: center;
  inline-size: 100%;
  min-block-size: calc(var(--action-height) + 2px);
  margin-block-start: 0;
  padding: 0;
  border: 1px solid var(--action-color);
  background-color: var(--color-action-bg);
  color: var(--action-color);
  font: inherit;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-card);

  &:first-child {
    margin-block-start: 0;
  }

  &:is(:hover, :focus-visible, .selected) {
    background-color: var(--action-color);
    color: var(--color-text-inverse);

    & .side {
      background-color: var(--color-action-side-bg-hover);
      color: var(--color-text-inverse);
    }
  }
}

.progress {
  cursor: default;
}

.loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background-color: var(--color-action-bg);
  color: var(--brand-seventh);
  font-size: var(--font-size-action-icon);
}
.checkin {
  --action-color: var(--brand-primary);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}

.collect {
  --action-color: var(--brand-quaternary);
}

.list {
  --action-color: var(--brand-secondary);
}

.favorites {
  --action-color: var(--brand-seventh);
}

.comment {
  --action-color: var(--brand-sixth);
}

.icon {
  inline-size: var(--action-icon-width);
  padding-inline: 5px;
  font-size: var(--font-size-action-icon);
  line-height: 1;

  .favorites & {
    font-size: var(--font-size-action-star);
  }
}

.main-info {
  flex: 1;
  padding-block: 10px;
  font-family: var(--font-headings);
  font-size: var(--font-size-action);
  font-weight: var(--font-weight-headings);
  line-height: 34px;
  text-transform: uppercase;
}

.text {
  flex: 1;
  padding-block: 10px;
  & .main-info {
    display: block;
    padding: 0;
    line-height: var(--line-height-headings);
  }
}
.under-info {
  display: block;
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  line-height: var(--line-height-headings);
}
.side {
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0 6px 0 8px;
  background-color: var(--color-action-side-bg);
  color: var(--color-action-side);
  font-size: var(--font-size-large);
  transition: all var(--transition-card);
}
@media (prefers-reduced-motion: reduce) {
  .action,
  .side {
    transition: none;
  }
}
</style>
