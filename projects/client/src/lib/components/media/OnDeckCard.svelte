<!--
  OG's on-deck card: a show's next episode as a poster card with the progress bar
  under its quick icons, the episode as the title, then rewatch and drop icons before the show's title. The dashboard's
  Up Next panel and the progress page's grid view both use it.
  The shared visibility controls start a rewatch or drop the show. Dashboard callbacks refresh the card after saves.
-->
<script lang="ts">
import VisibilityControl from '$lib/components/visibility/VisibilityControl.svelte';
import Icon from '$lib/icons/Icon.svelte';
import backward from '$lib/icons/light/backward.svg?raw';
import circleMinus from '$lib/icons/light/circle-minus.svg?raw';
import type { OverlayState } from '$lib/overlay/createOverlay.svelte';
import type { OnDeckItem } from '$lib/components/media/OnDeckItem';
import PosterCard from '$lib/components/media/PosterCard.svelte';
import RefreshCover from '$lib/components/media/RefreshCover.svelte';
import { progressPercent } from '$lib/components/media/progressPercent';
import { progressTooltip } from '$lib/components/media/progressTooltip';
import { quickIconFill } from '$lib/components/media/quickIconFill';
import UnderProgress from '$lib/components/media/UnderProgress.svelte';

interface Props {
  item: OnDeckItem;
  /** The viewer's overlay state for the episode. */
  state?: OverlayState;
  onRewatch?: () => void;
  onWatchSave?: (watchedAt: string | null) => void;
  onRefresh?: () => void;
  needsRefresh?: boolean;
  refreshing?: boolean;
}

const { item, state = {}, onRewatch, onWatchSave, onRefresh, needsRefresh = false, refreshing = false }: Props =
  $props();
const target = $derived({
  type: 'episode' as const,
  id: item.episodeId,
  title: item.showTitle + ' ' + item.episodeNumber,
  season: item.seasonNumber === undefined || item.episode === undefined
    ? undefined
    : { show: item.showId, number: item.seasonNumber, episode: item.episode },
});
const showTarget = $derived({
  type: 'show' as const,
  id: item.showId,
  title: item.showTitle,
  airedEpisodes: item.progress.aired,
  runtime: item.runtime,
});

const title = $derived(item.episodeTitle ? `${item.episodeNumber} ${item.episodeTitle}` : item.episodeNumber);
const lines = $derived(
  progressTooltip({ progress: item.progress, fullProgress: item.fullProgress, runtime: item.runtime }),
);
</script>

<!-- Hrefs point at OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="on-deck-card" aria-busy={refreshing}>
  <PosterCard
    href={item.complete ? item.showHref : item.episodeHref}
    title={item.complete ? item.showTitle : title}
    fullTitle={item.complete ? item.showTitle : `${item.showTitle} ${item.episodeNumber}`}
    image={item.poster}
    episodeBadge={item.complete ? undefined : item.episodeBadge}
    rewatching={item.rewatching}
    userRating={state.rating}
    icons={{ listTarget: item.complete ? showTarget : target, watchTarget: item.complete ? showTarget : target, collectionTarget: item.complete ? showTarget : target, ratingTarget: item.complete ? showTarget : target, onWatchSave, fill: quickIconFill({ state }), rating: item.complete ? undefined : item.rating, listLabel: item.complete ? 'Add to watchlist' : 'Add to list' }}
  >
    {#snippet progress()}
      <UnderProgress href={item.progressHref} percent={progressPercent(item.progress)} ticks={item.ticks} {lines} />
    {/snippet}
    {#snippet posterOverlay()}
      {#if refreshing || needsRefresh}<RefreshCover title={item.showTitle} {refreshing} onrefresh={onRefresh} />
      {:else if item.complete}<div class="completion">{item.completionLabel}</div>{/if}
    {/snippet}
    {#if item.complete}<div class="show-line"><b>100% watched!</b></div>{:else}
    <div class="show-line">
      <div class="action"><VisibilityControl target={showTarget} action="rewatch" variant="badge" onsave={onRewatch}><Icon svg={backward} /></VisibilityControl></div>
      <div class="action drop"><VisibilityControl target={showTarget} action="drop" variant="badge"><Icon svg={circleMinus} /></VisibilityControl></div>
      <a class="show-link" href={item.showHref}>{item.showTitle}</a>
    </div>
    {/if}
  </PosterCard>
</div>

<style>
.completion {
  position: absolute;
  inset-inline-start: var(--space-lg-inline);
  inset-block-end: var(--on-deck-completion-bottom);
  margin-block-end: var(--space-sm-block);
  padding: var(--on-deck-completion-padding);
  background: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--on-deck-completion-size);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-headings);
  pointer-events: none;
}

.on-deck-card {
  /* Dark knight drew on-deck cards without borders, on a darker bar. */
  --color-card-border: var(--color-on-deck-border);
  --color-card-bg: var(--color-on-deck-quick-icons);
}

/* OG's h4 under the title: 12px, 5px down, clipped to one line. */
.show-line {
  margin: var(--space-sm-block) 0 0;
  overflow: hidden;
  font-family: var(--font-headings);
  font-size: var(--font-size-card-subtitle);
  line-height: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action {
  display: inline;
  min-block-size: 0;
  margin: 0 var(--space-xs-inline) 0 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-card-action);
  font-size: inherit;
  line-height: inherit;
  vertical-align: middle;
  cursor: pointer;
  transition: color var(--transition-card);

  &:is(:hover, :focus-visible) {
    color: var(--color-card-action-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--color-link);
    outline-offset: 1px;
  }
}

/* fa-sm */
.drop {
  font-size: 0.875em;
}

.show-link {
  color: var(--color-text);
  vertical-align: middle;

  &:is(:hover, :focus-visible) {
    color: var(--color-text);
  }
}

@media (prefers-reduced-motion: reduce) {
  .action {
    transition: none;
  }
}
</style>
