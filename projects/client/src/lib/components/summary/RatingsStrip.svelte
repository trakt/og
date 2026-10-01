<!--
  OG's `#summary-ratings-wrapper`: the dark bar along the bottom of a summary's fanart. The Trakt rating and the
  viewer's rating, then other sites' ratings and the community counts. Render it in FanartHeader's `stats` slot.
  The viewer rating opens the shared ten-heart popover.
-->
<script lang="ts">
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import MediaRating from '$lib/components/rating/MediaRating.svelte';
import type { SpoilerTarget } from '$lib/settings/SpoilerTarget';
import type { RatingTarget } from '$lib/components/rating/RatingTarget';
import { RATING_LABELS } from '$lib/components/rating/ratingPrompt';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import heartOutline from '$lib/icons/regular/heart.svg?raw';
import heart from '$lib/icons/solid/heart.svg?raw';
import imdb from '$lib/assets/sites/imdb.png';
import justwatch from '$lib/assets/sites/justwatch.svg';
import metacritic from '$lib/assets/sites/metacritic.png';
import audienceCertified from '$lib/assets/sites/rt/audience-certified.svg';
import audienceSpilled from '$lib/assets/sites/rt/audience-spilled.svg';
import audienceUpright from '$lib/assets/sites/rt/audience-upright.svg';
import tomatometerCertified from '$lib/assets/sites/rt/tomatometer-certified.svg';
import tomatometerFresh from '$lib/assets/sites/rt/tomatometer-fresh.svg';
import tomatometerRotten from '$lib/assets/sites/rt/tomatometer-rotten.svg';
import tmdb from '$lib/assets/sites/tmdb.svg';
import { readableStat } from '$lib/utils/readableStat';
import type { ExternalRating, ExternalRatingLogo } from './ExternalRating.ts';

interface Count {
  readonly count: number;
  /** Already pluralized: "watchers", "library". */
  readonly label: string;
  readonly href?: string;
}

interface Props {
  /** The Trakt rating, 0 to 10. Left out, the rating is hidden (OG hid it before release). */
  rating?: { readonly value: number; readonly votes: number; readonly href: string };
  /** "movie", "show", "season", "episode": finishes "Rate this ...". Left out, there's no rating slot. */
  rateLabel?: string;
  ratingTarget?: RatingTarget & SpoilerTarget;
  external?: readonly ExternalRating[];
  /** Zero counts are dropped. */
  counts?: readonly Count[];
}

const { rating, rateLabel, ratingTarget, external = [], counts = [] }: Props = $props();

const logos: Record<ExternalRatingLogo, string> = {
  imdb,
  tmdb,
  'tomatometer-certified': tomatometerCertified,
  'tomatometer-fresh': tomatometerFresh,
  'tomatometer-rotten': tomatometerRotten,
  'audience-certified': audienceCertified,
  'audience-spilled': audienceSpilled,
  'audience-upright': audienceUpright,
  metacritic,
  justwatch,
};

// OG truncated instead of rounding, so 79.9% reads 79%.
const percent = $derived(rating ? Math.trunc(rating.value * 10) : 0);
const level = $derived(rating ? Math.min(Math.trunc(rating.value), 10) : 0);
const shownCounts = $derived(counts.filter(({ count }) => count > 0));
</script>

<!-- Links go out to other sites or to subpages og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<div class="ratings-strip">
  <ul class="ratings">
    {#if rating}
      <li>
        <MediaSpoiler target={ratingTarget} kind="rating"><a href={rating.href}>
          <span class="heart" style:color={level > 0 ? `var(--rating-${level})` : undefined}><Icon svg={heart} /></span>
          <span class="number">
            <span class="rating">{percent}%</span>
            <span class="votes">{readableStat(rating.votes)} {rating.votes === 1 ? 'vote' : 'votes'}</span>
          </span>
        </a></MediaSpoiler>
      </li>
    {/if}
    {#if rateLabel && ratingTarget}
      <li>
        <MediaRating target={ratingTarget} variant="summary">
          {#snippet trigger({ value, preview })}
            {@const shown = preview ?? value}
            {@const unrate = preview !== null && preview === value}
            <span class="rate">
              <span class="heart" style:color={shown && !unrate ? `var(--rating-${shown})` : undefined}>
                <Icon svg={shown && !unrate ? heart : heartOutline} />
              </span>
              <span class="number">
                {#if shown && !unrate}
                  <span class="rating">{shown}</span>
                  <span class="votes">{RATING_LABELS[shown]}</span>
                {:else}
                  <span class="question">{unrate ? 'Unrate' : `Rate this ${rateLabel}`}</span>
                  <span class="votes">{unrate && shown ? RATING_LABELS[shown] : 'What did you think?'}</span>
                {/if}
              </span>
            </span>
          {/snippet}
        </MediaRating>
      </li>
    {/if}
  </ul>
  {#if external.length > 0 || shownCounts.length > 0}
    <ul class="stats">
      {#each external as site (site.logo)}
        <li class={site.metascore}>
          <MediaSpoiler target={ratingTarget} kind="rating"><Tooltip text={site.title}>
            {#snippet trigger(tooltip)}
              <a href={site.href} target="_blank" rel="noopener" {...tooltip}>
                <img class={['logo', site.logo]} src={logos[site.logo]} alt={site.title.split('\n').at(0)} />
                <span class="number">
                  <span class="rating">
                    {site.rating}
                    {#if site.delta}<span class="delta">{site.delta}</span>{/if}
                  </span>
                  {#if site.metascore}
                    <span class="metascore-bar"></span>
                  {:else}
                    <span class="votes">{site.votes}</span>
                  {/if}
                </span>
              </a>
            {/snippet}
          </Tooltip></MediaSpoiler>
        </li>
      {/each}
      {#each shownCounts as { count, label, href } (label)}
        <li>
          <svelte:element this={href ? 'a' : 'span'} class="count" {href}>
            <span class="number">
              <span class="rating">{readableStat(count)}</span>
              <span class="votes">{label}</span>
            </span>
          </svelte:element>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
.ratings-strip {
  display: flex;
  padding-block-start: 5px;
  padding-inline-start: var(--summary-offset);
  overflow-x: auto;
  scrollbar-width: none;
  white-space: nowrap;

  @media (width < 992px) {
    padding-inline-start: var(--summary-offset-sm);
  }

  @media (width < 768px) {
    padding-inline-start: 0;
  }
}

ul {
  display: flex;
  gap: 30px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stats {
  margin-inline-start: 30px;
}

a,
.count,
.rate {
  min-block-size: 0;
  display: flex;
  align-items: flex-start;
  color: inherit;
  text-decoration: none;

  &:is(:hover, :focus) {
    color: inherit;
    text-decoration: none;
  }
}

.rate {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}

.heart {
  margin-inline-end: 7px;
  font-size: var(--font-size-action-icon);
  line-height: 1;
  text-shadow: var(--text-shadow-headings);
}

.logo {
  inline-size: 30px;
  block-size: 30px;
  margin-inline-end: 7px;

  &.audience-spilled {
    inline-size: 36px;
    block-size: 36px;
    margin-block: -3px;
  }

  &.metacritic {
    border: 2px solid var(--color-metascore-none);
    border-radius: 50%;
  }
}

.number {
  display: flex;
  flex-direction: column;
  line-height: 1;
  color: var(--color-card-text);
  text-shadow: var(--text-shadow-headings);
}

.rating {
  font-family: var(--font-headings);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-headings-heavy);
}

.question {
  padding-block: 2px;
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-heavy);
}

.votes {
  font-size: var(--font-size-small);
  color: var(--color-ratings-muted);
}

.metascore-bar {
  block-size: 8px;
  margin-block-start: 2px;
  background-color: var(--color-metascore-none);
}

.high {
  --metascore: var(--color-metascore-high);
}

.medium {
  --metascore: var(--color-metascore-medium);
}

.low {
  --metascore: var(--color-metascore-low);
}

:is(.high, .medium, .low) {
  & .logo {
    border-color: var(--metascore);
  }

  & .metascore-bar {
    background-color: var(--metascore);
  }
}
</style>
