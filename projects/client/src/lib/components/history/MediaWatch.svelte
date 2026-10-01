<script lang="ts">
import { page } from '$app/state';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { login } from '$lib/auth/login';
import { userManager } from '$lib/auth/userManager';
import { overlay } from '$lib/overlay/overlay';
import { checkin } from '$lib/components/checkin/checkin.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import VisibilityControl from '$lib/components/visibility/VisibilityControl.svelte';
import lightBackward from '$lib/icons/light/backward.svg?raw';
import circleMinus from '$lib/icons/light/circle-minus.svg?raw';
import WatchPopover from '$lib/components/history/WatchPopover.svelte';
import { loadWatchEpisodes } from '$lib/components/history/loadWatchEpisodes';
import { watchMedia } from '$lib/components/history/watchMedia';
import { watchAction } from '$lib/components/history/watchAction';
import type { HistoryPlay } from '$lib/components/history/HistoryPlay';
import type { WatchTarget } from '$lib/components/history/WatchTarget';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import check from '$lib/icons/trakt/check.svg?raw';
import checkThick from '$lib/icons/trakt/check-thick.svg?raw';
import backward from '$lib/icons/solid/backward.svg?raw';
import { countLabel } from '$lib/utils/countLabel';
import { formatDate } from '$lib/utils/formatDate';
import { formatRuntime } from '$lib/utils/formatRuntime';

interface Props {
  target: WatchTarget;
  variant?: 'summary' | 'card';
  small?: boolean;
  play?: HistoryPlay;
  onremove?: (play?: HistoryPlay) => void;
  onsave?: (watchedAt: string | null) => void;
}
const { target, variant = 'card', small = false, play, onremove, onsave }: Props = $props();
let busy = $state(false);
const viewerState = $derived(overlay.state(target.type, target.id, target.season));
const dates = $derived(page.data.datePreferences);
const rewatching = $derived(
  viewerState.rewatching && page.data.settings?.browsing?.rewatching?.adjust_percentage !== false,
);
const completed = $derived(
  rewatching ? viewerState.rewatchedEpisodes ?? viewerState.watchedEpisodes : viewerState.watchedEpisodes,
);
const plays = $derived(rewatching ? viewerState.rewatchedPlays ?? viewerState.watchedPlays : viewerState.watchedPlays);
const fill = $derived(
  quickIconFill({
    state: viewerState,
    adjustRewatching: page.data.settings?.browsing?.rewatching?.adjust_percentage,
    airedEpisodes: target.airedEpisodes,
    runtime: target.runtime,
    datePreferences: dates,
  }),
);
const plural = $derived(target.type === 'show' || target.type === 'season');
const ticks = $derived(
  Array.from(
    { length: target.airedEpisodes ?? 0 },
    (_, index) => target.episodeIds?.length === target.airedEpisodes ? target.episodeIds?.at(index) : undefined,
  ),
);
const defaultAt = $derived(page.data.settings?.browsing?.watch_popup_action);
const { type, id } = $derived(target);
const oncheckin = $derived(
  variant === 'card' && (type === 'movie' || type === 'episode') && !page.data.settings?.browsing?.hide_watching_now
    ? () => void checkin.open({ type, id })
    : undefined,
);
const historyHref = $derived(
  `/users/me/history${
    target.type === 'movie'
      ? `?movie=${target.id}`
      : target.type === 'episode'
      ? `?episode=${target.id}`
      : target.type === 'season'
      ? `/episodes?season=${target.id}`
      : `/episodes?show=${target.id}`
  }`,
);
const label = $derived(
  (fill.watched > 0 || rewatching)
    ? plural
      ? `${Math.floor(fill.watched * 100)}% ${rewatching ? 'rewatched' : 'watched'}`
      : countLabel(viewerState.plays ?? 1, 'play')
    : 'Add to history',
);
const request = (path: string, body?: unknown) =>
  rawApiFetch({
    fetch: path.startsWith('/search/') ? globalThis.fetch : authenticatedFetch({ manager: userManager() }),
    path,
    init: body === undefined
      ? undefined
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  });
async function watch(watchedAt: string | null, force: boolean, onlyPlay?: HistoryPlay) {
  if (busy) return;
  busy = true;
  try {
    const saved = await watchMedia({
      target,
      watchedAt,
      play: onlyPlay,
      force,
      overlay,
      request,
      notify: toast,
      episodes: () => loadWatchEpisodes({ target, fetch: authenticatedFetch({ manager: userManager() }) }),
    });
    if (saved && watchedAt === null) onremove?.(onlyPlay);
    if (saved) onsave?.(watchedAt);
    if (saved) void overlay.refresh();
  } finally {
    busy = false;
  }
}
async function remaining() {
  if (!['now', 'released', 'unknown'].includes(defaultAt ?? '')) return false;
  await watch(defaultAt ?? 'now', false);
  return true;
}
async function open(force: boolean): Promise<'date' | 'remove' | 'partial' | null> {
  if (!(await userManager().getUser())?.access_token) {
    await login();
    return null;
  }
  const action = watchAction({ fill: onremove ? 1 : fill.watched, force, defaultAt });
  if (action === 'date' || action === 'remove' || action === 'partial') return action;
  await watch(action, false);
  return null;
}
</script>

<!-- Filtered history routes are built from media ids. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
  {#snippet visibilityActions()}
    {#if variant === 'summary' && target.type === 'show' && (viewerState.watchedEpisodes ?? 0) > 0 && page.data.user}
      <VisibilityControl target={{ ...target, type: 'show' }} action="rewatch">
  <Icon svg={lightBackward} />
</VisibilityControl>
      {#if !viewerState.dropped}<VisibilityControl target={{ ...target, type: 'show' }} action="drop">
  <Icon svg={circleMinus} />
</VisibilityControl>{/if}
    {/if}
  {/snippet}

<WatchPopover label={onremove ? 'Remove from history' : variant === 'summary' ? label : 'Add to watched history'}
  {variant} {small} {busy} {plural}
  fill={onremove ? 1 : fill.watched} selected={Boolean(onremove) || fill.watched > 0 || Boolean(rewatching)}
  datePreferences={dates}
  tooltip={onremove ? 'Remove from history' : variant === 'card' ? fill.titles.watched ?? 'Add to watched history' : undefined}
  extraActions={variant === 'summary' && target.type === 'show' && (viewerState.watchedEpisodes ?? 0) > 0 && page.data.user ? visibilityActions : undefined}
  onremovePlay={play && onremove ? () => void watch(null, false, play) : undefined}
  onopen={open} onwatch={watch} onremaining={remaining} {oncheckin}
  oninvalid={() => toast.error('Invalid date format, please use the date picker.')}>
  {#snippet trigger()}
    {#if variant === 'summary'}
      <span class="watch-icon"><Icon svg={check} fixedWidth /></span>
      <span class="info">
        <span class="main-info">{label}</span>
        {#if fill.watched > 0 || rewatching}
          <span class="under-info">
            {#if plural}{completed}/{target.airedEpisodes} eps &mdash; {countLabel(plays ?? 0, 'play')}{#if target.runtime} <em>({formatRuntime((plays ?? 0) * target.runtime)})</em>{/if}
            {:else if viewerState.lastWatchedAt}{viewerState.lastWatchedAt.startsWith('1970-01-01') ? 'Unknown date' : formatDate(viewerState.lastWatchedAt, dates)}{/if}
          </span>
        {/if}
      </span>
    {:else}<Icon svg={viewerState.rewatching ? backward : checkThick} />{/if}
  {/snippet}
  {#snippet details()}
    {#if viewerState.dropped && target.type === 'show'}<VisibilityControl target={{ ...target, type: 'show' }} action="restore" variant="pill" tooltip={viewerState.droppedAt ? `Dropped on\n${formatDate(viewerState.droppedAt, dates)}` : 'Dropped'}>Dropped</VisibilityControl>{/if}
    {#if (viewerState.watchedEpisodes ?? 0) > 0 || fill.watched > 0}<a class="history-link" href={historyHref}>View History</a>{/if}
  {/snippet}
</WatchPopover>
{#if variant === 'summary' && plural && (fill.watched > 0 || rewatching) && target.airedEpisodes}
  <Tooltip text={fill.titles.watched} placement="bottom">
    {#snippet trigger(tip)}
      <a class="watch-progress" href={historyHref} aria-label={fill.titles.watched} {...tip}>
        {#each ticks as id, index (index)}<span class:done={id === undefined ? index < (completed ?? 0) : rewatching && viewerState.rewatchingAt ? (overlay.state('episode', id).lastWatchedAt ?? '') >= viewerState.rewatchingAt : overlay.state('episode', id).watched}></span>{/each}
      </a>
    {/snippet}
  </Tooltip>
{/if}

<style>
.watch-icon {
  inline-size: var(--action-icon-width);
  flex-shrink: 0;
  padding-inline: var(--watch-icon-padding);
  font-size: var(--font-size-action-icon);
  line-height: 1;
}
.info {
  padding-block: var(--watch-info-block);
  font-family: var(--font-headings);
}
.main-info {
  display: block;
  font-size: var(--font-size-action);
  font-weight: var(--font-weight-headings);
  line-height: var(--watch-summary-line);
  text-transform: uppercase;
  .info:has(.under-info) & {
    line-height: var(--watch-summary-selected-line);
  }
}
.under-info {
  display: block;
  font-size: var(--watch-detail-size);
  line-height: var(--watch-detail-line);
}
.history-link {
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--watch-history-size);
  line-height: var(--watch-detail-line);
  text-decoration: none;
  padding: var(--watch-history-block) var(--watch-history-inline);
  background: var(--color-watch-history);
  border-radius: var(--watch-choice-radius);
  font-weight: var(--font-weight-headings-heavy);
  &:is(:hover, :focus-visible) {
    background: var(--color-watch-history-hover);
    text-decoration: underline;
  }
}
.watch-progress {
  display: flex;
  gap: var(--watch-progress-gap);
  block-size: var(--watch-progress-height);
  background: var(--progress-under-bg);
  & span {
    flex: 1;
  }
  & .done {
    background: var(--brand-tertiary);
  }
}
</style>
