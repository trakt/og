<!--
  One show on the progress page: the poster, then the title, the tick bar and
  what's been watched (or collected), the seasons to open under it, and the next episode's fanart card on the right.
  On your own profile the title has rewatch and drop (or hide, on Library) icons: drop and hide take the row off the
  page as they save, and rewatch reloads it. A watch (or collect) on the next episode reloads it too, at once with the
  "refresh" setting on, otherwise from a "Next Episode" cover . A dropped show (the Dropped
  tab) says when you dropped it and has no drop icon; rewatching it also undrops it.
-->
<script lang="ts">
import { toast } from '$lib/components/toast/toast.svelte';
import FanartCard from '$lib/components/media/FanartCard.svelte';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import RefreshCover from '$lib/components/media/RefreshCover.svelte';
import { removeCard } from '$lib/components/media/removeCard';
import RewatchingBadge from '$lib/components/media/RewatchingBadge.svelte';
import TickBar from '$lib/components/media/TickBar.svelte';
import Icon from '$lib/icons/Icon.svelte';
import backward from '$lib/icons/light/backward.svg?raw';
import lightBan from '$lib/icons/light/ban.svg?raw';
import circleMinus from '$lib/icons/light/circle-minus.svg?raw';
import regularCircleMinus from '$lib/icons/regular/circle-minus.svg?raw';
import solidBackward from '$lib/icons/solid/backward.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import VisibilityControl from '$lib/components/visibility/VisibilityControl.svelte';
import type { ProgressType } from './progressTypes.ts';
import ProgressSeasons from './ProgressSeasons.svelte';
import type { ProgressRow } from './toProgressRow.ts';

interface Props {
  row: ProgressRow;
  type: ProgressType;
  simple: boolean;
  /** Your own profile: the rewatch, drop and hide icons show. */
  isSelf: boolean;
  datePreferences: DatePreferences;
  /** Reads the show's row again. Left out (someone else's profile), nothing reloads. */
  refresh?: (row: ProgressRow, options: { rewatched: boolean }) => Promise<ProgressRow>;
  /** The viewer's "refresh" setting: reload right after a watch instead of offering "Next Episode". */
  autoRefresh?: boolean;
  /** A drop or hide started: the page takes the row out, and puts it back if the save doesn't go through. */
  onremove?: (saved: Promise<boolean>) => void;
}

const { row: initial, type, simple, isSelf, datePreferences, refresh, autoRefresh = false, onremove }: Props = $props();

// The page's row until a reload replaces it.
let row = $derived(initial);
let refreshing = $state(false);
let needsRefresh = $state(false);
let article = $state<HTMLElement>();
// Read only when the row leaves: paging and filtering aren't removals.
let removedByAction = false;
$effect(() => {
  void initial;
  refreshing = false;
  needsRefresh = false;
});

const showTarget = $derived({ type: 'show' as const, id: row.id, title: row.title });
const next = $derived(row.next);
const viewerState = $derived(overlay.state(next.target.type, next.target.id));
const fill = $derived(quickIconFill({ state: viewerState, airedEpisodes: next.airedEpisodes, datePreferences }));
const plural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`;
const count = (n: number) => n.toLocaleString('en-US');
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function load(rewatched: boolean) {
  if (!refresh) return;
  const source = initial;
  // OG kept the row dimmed for at least half a second, so a quick reload doesn't flash.
  const [result] = await Promise.allSettled([refresh(row, { rewatched }), pause(500)]);
  if (source !== initial) return;
  refreshing = false;
  if (result.status === 'fulfilled') {
    row = result.value;
    needsRefresh = false;
    return;
  }
  needsRefresh = true;
  toast.error('Doh! There was an error refreshing this show. Please try Next Episode again.');
}

function reload() {
  if (refreshing) return;
  refreshing = true;
  void load(false);
}

/** After a watch (or collect) of the next episode. A removal leaves the row as it is. */
function watched(at: string | null | undefined) {
  if (!refresh || typeof at !== 'string') return;
  needsRefresh = true;
  if (autoRefresh) reload();
}

async function rewatch(saved: Promise<boolean>) {
  if (!refresh) return;
  refreshing = true;
  if (await saved) return load(true);
  refreshing = false;
}

/** Drop and hide: the focus moves to the next row's title before this one fades out. */
function remove(saved: Promise<boolean>) {
  const rows = [...(article?.parentElement?.querySelectorAll<HTMLElement>(':scope > .progress-row') ?? [])];
  const index = rows.findIndex((candidate) => candidate === article);
  const nextRow = [...rows.slice(index + 1), ...rows.slice(0, index).toReversed()].at(0);
  const section = article?.closest<HTMLElement>('section');
  removedByAction = true;
  onremove?.(saved);
  if (nextRow) {
    nextRow.querySelector<HTMLElement>('a.titles-link')?.focus({ preventScroll: true });
  } else if (section) {
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
  }
  void saved.then((kept) => {
    if (!kept) removedByAction = false;
  });
}
</script>

<!-- Show, season and episode pages are OG routes og hasn't all built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet last(episode: NonNullable<ProgressRow['last']>)}
  <a class="last-episode"
  href={episode.href}>{episode.title ? `${episode.number} ${episode.title}` : episode.number}</a>{episode.relative ? ` ${episode.relative}` : ''} on {episode.date}.
{/snippet}

{#snippet action(visibility: 'rewatch' | 'drop' | 'hide', svg: string)}
  <!-- The control's popover can't sit inside the h3 (its own heading would end the title's), so these follow it. -->
  <span class={['action', visibility]}>
  <VisibilityControl target={showTarget} action={visibility}
    section={visibility === 'hide' ? 'progress_collected' : undefined}
    variant="badge" placement="top" onsaving={visibility === 'rewatch' ? rewatch : remove}>
    <Icon {svg} />
  </VisibilityControl>
</span>
{/snippet}

<article bind:this={article} class={['progress-row', { loading: refreshing }]} aria-labelledby="progress-{row.id}"
  aria-busy={refreshing} out:removeCard|global={() => removedByAction}>
  <a class="poster" href={row.href} tabindex="-1" aria-hidden="true">
    {#if row.poster}
      <img src={row.poster} alt="" loading="lazy" decoding="async" />
    {:else}
      <span class="placeholder"></span>
    {/if}
    {#if row.rewatchingSince}<RewatchingBadge date={row.rewatchingSince} />{/if}
  </a>

  <div class="main-info">
    <div class="show-title">
      <h3 class="title" id="progress-{row.id}"><a class="titles-link" href={row.href}>{row.title}</a></h3>
      {#if isSelf && type === 'watched'}{@render action('rewatch', backward)}{/if}
      <!-- Nothing to drop on the Dropped tab. -->
      {#if isSelf && type === 'watched' && !row.droppedOn}
        {@render action('drop', circleMinus)}
      {:else if isSelf && type === 'library'}
        {@render action('hide', lightBan)}
      {/if}
    </div>

    <TickBar runs={row.ticks} percent={row.percent} {simple}
      label={`${row.title}: ${row.percent}% ${type === 'watched' ? 'watched' : 'in your library'}`} />

    {#if row.droppedOn}
      <p class="dropped"><Icon svg={regularCircleMinus} />Dropped on {row.droppedOn}</p>
    {/if}
    {#if row.rewatchingSince}
      <p class="rewatching"><Icon svg={solidBackward} /> Rewatching since {row.rewatchingSince}</p>
    {/if}

    <p class="summary">
      {#if type === 'watched'}
        Watched <strong>{count(row.completed)}</strong> of <strong>{count(row.aired)}</strong>
        {plural(row.aired, 'episode')} for <strong>{count(row.plays)}</strong> {plural(row.plays, 'play')}
        (<strong>{row.watchedTime}</strong>){row.left === 0 ? '. Great job, every episode is watched!' : ' which leaves '}{#if
          row.left > 0
        }<strong>{count(row.left)}</strong> {plural(row.left, 'episode')} (<strong>{row.leftTime}</strong>) left to
          watch.{/if}
        {#if row.last}<br class="wide-only" />Last watched {@render last(row.last)}{/if}
      {:else}
        <strong>{count(row.completed)}</strong> of <strong>{count(row.aired)}</strong> episodes are in your
        library{row.left === 0 ? '. Great job, every episode is in your library!' : ' which leaves '}{#if
          row.left > 0
        }<strong>{count(row.left)}</strong> {plural(row.left, 'episode')} left to collect.{/if}
        {#if row.last}Last added to library {@render last(row.last)}{/if}
      {/if}
    </p>

    <ProgressSeasons id={row.id} title={row.title} seasons={row.seasons} {type} {simple} {isSelf} />
  </div>

  <div class="next">
    <FanartCard
      href={next.href}
      title={next.title}
      year={next.year}
      number={next.number}
      image={next.image}
      tags={next.tags}
      userRating={viewerState.rating}
      icons={{
        fill,
        rating: next.rating,
        ratingTarget: next.target,
        watchTarget: { ...next.target, airedEpisodes: next.airedEpisodes, season: next.season },
        listTarget: next.target,
        watchNow: 'play',
        listLabel: next.target.type === 'episode' ? 'Add to list' : 'Add to watchlist',
        onWatchSave: type === 'watched' ? watched : undefined,
        onCollectionSave: type === 'library' ? watched : undefined,
      }}
    >
      {#snippet fanartOverlay()}
        {#if refreshing || needsRefresh}<RefreshCover title={row.title} {refreshing} onrefresh={reload} />{/if}
      {/snippet}
    </FanartCard>
  </div>
</article>

<style>
/* `.row.posters.fanarts.twenty-four-cols`: the poster in 3 of 24 columns, the card in 6, the text between. */
.progress-row {
  display: grid;
  grid-template-columns:
    calc((100% + var(--gutter)) / 8 - var(--gutter))
    1fr
    calc((100% + var(--gutter)) / 4 - var(--gutter));
  align-items: start;
  column-gap: var(--gutter);
  margin-block: var(--progress-row-margin);

  &.loading {
    opacity: var(--opacity-progress-loading);
  }
}

.poster {
  position: relative;
  display: block;

  & :is(img, .placeholder) {
    display: block;
    inline-size: 100%;
    aspect-ratio: var(--ratio-poster);
    object-fit: cover;
  }

  & .placeholder {
    background-color: var(--color-card-bg);
    background-image: var(--image-placeholder-poster);
    background-size: cover;
  }

  /* OG pulled the badge 10px past the poster's corner here. */
  & :global(.rewatching-badge) {
    inset-inline-start: var(--progress-rewatching-badge-start);
  }
}

.main-info {
  min-inline-size: 0;
  font-size: var(--font-size-progress-row);
}

.show-title {
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-progress-title);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
}

.title {
  display: inline-block;
  max-inline-size: calc(100% - var(--progress-title-actions-width));
  margin: 0;
  font: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: top;
}

.action {
  display: inline-block;
  margin: 0 0 var(--progress-action-nudge) var(--progress-action-gap);
  color: var(--color-progress-action);
  font-size: 0.8em;
  line-height: 1;
  vertical-align: middle;
  transition: color var(--transition-card);

  &:hover,
  &:has(:global(:focus-visible)) {
    color: var(--brand-primary);
  }

  /* The icon sits as it did in a plain inline button. */
  & :global(.visibility-control) {
    display: inline;
  }

  & :global(.visibility-trigger) {
    display: inline-block;
    vertical-align: top;
  }

  & :global(.visibility-trigger:focus-visible) {
    outline: 2px solid var(--color-link);
    outline-offset: 1px;
  }
}

/* fa-sm */
.drop {
  font-size: 0.7em;
}

/* fa-sm fa-rotate-90 */
.hide {
  font-size: 0.7em;

  & :global(.icon) {
    rotate: 90deg;
  }
}

.summary {
  margin: 0;
  line-height: var(--line-height-progress-row);

  & strong {
    font-family: var(--font-headings);
    font-weight: var(--font-weight-headings-heavy);
  }
}

/* OG's `div.dropped` and `div.rewatching` keep the body's line height. */
.dropped,
.rewatching {
  margin: 0 0 var(--space-lg-block);
  color: var(--color-progress-rewatching);
  font-style: italic;
  line-height: var(--line-height-base);

  & :global(.icon) {
    margin-block-end: var(--progress-status-icon-nudge);
    vertical-align: middle;
  }
}

.dropped :global(.icon) {
  margin-inline-end: var(--progress-dropped-icon-gap);
}

.next {
  min-inline-size: 0;
}

@media (width < 1200px) {
  .wide-only {
    display: none;
  }
}

/* OG hid the poster below desktop and let the card take a third. */
@media (width < 992px) {
  .progress-row {
    grid-template-columns: 1fr calc((100% + var(--gutter)) / 3 - var(--gutter));
  }

  .poster {
    display: none;
  }
}

@media (width < 768px) {
  .progress-row {
    grid-template-columns: 1fr;
    row-gap: var(--space-lg-block);
  }
}

@media (prefers-reduced-motion: reduce) {
  .action {
    transition: none;
  }
}
</style>
