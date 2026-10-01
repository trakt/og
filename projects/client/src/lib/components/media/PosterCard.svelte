<!--
  OG's poster card: poster or episode screenshot, the quick-icon bar, then a one-line
  title and optional sub-lines. Lay several out with PosterGrid. `--card-border-width: 0` drops the 1px frame, as on
  the dashboard's recommendations band.
-->
<script lang="ts">
import { page } from '$app/state';
import posterPlaceholder from '$lib/assets/placeholders/poster.png';
import fanartPlaceholder from '$lib/assets/placeholders/fanart.png';
import bannerPlaceholder from '$lib/assets/placeholders/banner.png';
import { overlay } from '$lib/overlay/overlay';
import { formatDate } from '$lib/utils/formatDate';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import heart from '$lib/icons/solid/heart.svg?raw';
import { readableStat } from '$lib/utils/readableStat';
import type { ComponentProps, Snippet } from 'svelte';
import EpisodeTypeBadge from './EpisodeTypeBadge.svelte';
import CornerRating from './CornerRating.svelte';
import DroppedBadge from './DroppedBadge.svelte';
import QuickIcons from './QuickIcons.svelte';
import RankPill from './RankPill.svelte';
import type { HistoryPlay } from '$lib/components/history/HistoryPlay';
import { removeCard } from '$lib/components/media/removeCard';
import RewatchingBadge from './RewatchingBadge.svelte';

/** OG's sorted Trakt rating line: a heart in the rating's color, "72%", the votes. */
type RatingSubtitle = { readonly rating: number; readonly votes: number; readonly href: string };

type Subtitle = string | readonly (string | { readonly em: string })[] | {
  readonly text: string;
  readonly href: string;
} | RatingSubtitle;

interface Props {
  href: string;
  title: string;
  /** An episode's "2x04", bold before the title. */
  number?: string;
  /** The poster's tooltip. Defaults to the title. */
  fullTitle?: string;
  /** Image URL. Left out, the placeholder shows. */
  image?: string;
  /** `screenshot` is the 16:9 episode still. */
  variant?: 'poster' | 'screenshot' | 'banner';
  /** Logo artwork over a dimmed fanart, as on calendar grids. */
  logo?: string;
  logoMode?: boolean;
  /** Flush borders and compact dark titles, as in OG's seven-column calendar. */
  calendar?: boolean;
  /**
   * Lines under the title: year, "S1E3", an air date. A line can mix in italic parts: `['2024 — ', { em: '8 episodes' }]`,
   * or link somewhere else: `{ text: 'The Boys', href: '/shows/the-boys' }`, or be the Trakt rating line:
   * `{ rating: 7.2, votes: 1234, href }`.
   */
  subtitles?: readonly Subtitle[];
  /** The OG banner above an episode screenshot. */
  episodeBadge?: ComponentProps<typeof EpisodeTypeBadge>;
  /** The viewer's own rating, 1 to 10. */
  userRating?: number | null;
  /** Position in a ranked list, shown as a pill above the card. */
  rank?: number;
  /** A show the viewer dropped: greyed out under a dropped badge. */
  dropped?: boolean;
  /** Fade until hovered or focused, like the OG filters. */
  faded?: boolean;
  /** Other copies of a successfully removed item can leave with the same transition. */
  removing?: () => boolean;
  /** A rewatching badge on the top-left corner, where OG's progress pages put one. */
  rewatching?: boolean;
  /** Left out, the card has no quick-icon bar. */
  icons?: Omit<ComponentProps<typeof QuickIcons>, 'small'>;
  /** A thin progress bar right under the quick icons, like OG's `under_progress`. */
  progress?: Snippet;
  /** Lines under the title that need more than a string: links, icon buttons. */
  children?: Snippet;
  /** Drawn over the image, inside the poster link, like OG's library metadata. */
  cover?: Snippet;
  /** No title or sub-lines under the bar (discover's sliders). The poster becomes the card's link. */
  hideTitles?: boolean;
  /** Drawn over the poster outside its link, for controls of its own (a list's Read Notes). */
  posterOverlay?: Snippet;
}

const {
  href,
  title,
  number,
  fullTitle = number ? `${number} ${title}` : title,
  image,
  variant = 'poster',
  logo,
  logoMode = !!logo,
  calendar = false,
  subtitles = [],
  userRating,
  episodeBadge,
  rank,
  dropped = false,
  faded = false,
  removing = () => false,
  rewatching = false,
  icons,
  progress,
  children,
  cover,
  hideTitles = false,
  posterOverlay,
}: Props = $props();
// Read only when the card leaves. Navigation and day collapse aren't removals.
let removedByAction = false;
const cardIcons = $derived(
  icons
    ? {
      ...icons,
      onWatchRemove: icons.onWatchRemove
        ? (play?: HistoryPlay) => {
          removedByAction = true;
          icons?.onWatchRemove?.(play);
        }
        : undefined,
      onCollectionRemove: icons.onCollectionRemove
        ? () => {
          removedByAction = true;
          icons?.onCollectionRemove?.();
        }
        : undefined,
    }
    : undefined,
);
const target = $derived(icons?.hideTarget ?? icons?.ratingTarget ?? icons?.watchTarget ?? icons?.listTarget);
const state = $derived(target ? overlay.state(target.type, target.id) : undefined);
const isDropped = $derived(dropped || state?.dropped);
const hidden = $derived(
  target && icons?.hideSection !== 'dropped'
    ? overlay.isHidden(icons?.hideSection ?? 'recommendations', target.type, target.id)
    : false,
);
const restoreTarget = $derived(target?.type === 'show' ? { ...target, type: 'show' as const } : undefined);
</script>

<!-- Hrefs come in as props pointing at OG routes og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<article out:removeCard|global={() => removedByAction || removing()} hidden={hidden}
  class={['poster-card', { dropped: isDropped && image, faded, calendar }]}>
  {#if rank !== undefined}
    <RankPill {rank} />
  {/if}
  {#if rewatching || state?.rewatching}
    <RewatchingBadge date={state?.rewatchingAt ? formatDate(state.rewatchingAt, page.data.datePreferences) : undefined} />
  {/if}
  <!-- The title link below is the one in the tab order; this is the same link for the mouse. Without titles, it's the
       only link, so it takes the title as its name. -->
  <div class="poster-wrapper">
  <Tooltip text={fullTitle}>
    {#snippet trigger(tooltip)}
      <a
        class={['poster', variant, { 'logo-mode': logoMode }]}
        {href}
        tabindex={hideTitles ? undefined : -1}
        aria-hidden={hideTitles ? undefined : 'true'}
        aria-label={hideTitles ? fullTitle : undefined}
        {...tooltip}
      >
        <img class="image" src={image ?? (variant === 'banner' ? bannerPlaceholder : variant === 'screenshot' ? fanartPlaceholder : posterPlaceholder)} alt="" loading="lazy" decoding="async" />
        {#if logo}<img class="logo" src={logo} alt="" loading="lazy" decoding="async" />{/if}
        {#if episodeBadge}<EpisodeTypeBadge {...episodeBadge} />{/if}
        {#if userRating}
          <CornerRating rating={userRating} />
        {/if}
        {@render cover?.()}
      </a>
    {/snippet}
  </Tooltip>
  {@render posterOverlay?.()}
  {#if isDropped && image}<DroppedBadge target={restoreTarget} date={state?.droppedAt ? formatDate(state.droppedAt, page.data.datePreferences) : undefined} />{/if}
  </div>
  {#if cardIcons}
    <QuickIcons {...cardIcons} small />
  {/if}
  {@render progress?.()}
  {#if !hideTitles}
  <div class={['titles', { 'with-progress': progress }]}>
    <a class="titles-link" {href}><h3>{#if number}<span class="number">{number}</span> {title}{:else}{title}{/if}</h3></a>
    {#each subtitles as subtitle, i (i)}
      <a class="titles-link" href={typeof subtitle === 'object' && 'href' in subtitle ? subtitle.href : href}><span
          class="subtitle"
        >
          {#if typeof subtitle === 'string'}
            {subtitle}
          {:else if 'rating' in subtitle}
            <!-- Under 1 there's no rating-N color, like OG's `.grid-trakt-heart.rating-0`. -->
            <span style:color={subtitle.rating >= 1 ? `var(--rating-${Math.floor(subtitle.rating)})` : undefined}><Icon
                svg={heart}
              /></span>
            <b>{Math.trunc(subtitle.rating * 10)}%</b> — {readableStat(subtitle.votes)}
            {subtitle.votes === 1 ? 'vote' : 'votes'}
          {:else if 'text' in subtitle}
            {subtitle.text}
          {:else}
            {#each subtitle as part, j (j)}{#if typeof part === 'string'}{part}{:else}<em>{part.em}</em>{/if}{/each}
          {/if}
        </span></a>
    {/each}
    {@render children?.()}
  </div>
  {/if}
</article>

<style>
.poster-card {
  position: relative;
  min-inline-size: 0;
  transition: opacity var(--transition-card);
  &.faded:not(:hover, :focus-within) {
    opacity: var(--opacity-faded);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  & :global(.quick-icons) {
    border: var(--card-border-width, 1px) solid var(--color-card-border);
    border-block-start: none;
  }
}

.poster-wrapper {
  position: relative;
}
.poster-card[hidden] {
  display: none;
}

.poster {
  position: relative;
  display: block;
  overflow: hidden;
  border: var(--card-border-width, 1px) solid var(--color-card-border);
  border-block-end: none;
  background-color: var(--color-card-bg);

  /* The ratio sits on the image, inside the border, like OG's 100%-wide <img>. */
  & .image {
    display: block;
    inline-size: 100%;
    aspect-ratio: var(--ratio-poster);
    object-fit: cover;
  }

  &.screenshot .image {
    aspect-ratio: var(--ratio-fanart);
  }

  &.banner .image {
    aspect-ratio: var(--ratio-banner);
  }

  &.logo-mode .image {
    opacity: var(--opacity-fanart-behind-logo);
  }

  .dropped & .image {
    filter: grayscale(1);
  }
}

.titles {
  margin-block-end: 5px;
  text-align: center;
}

.titles-link {
  display: block;
  color: var(--color-text);
  text-decoration: none;

  &:is(:hover, :focus-visible) {
    color: var(--color-text);
    text-decoration: underline;
  }
}

h3,
.subtitle {
  display: block;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.number {
  font-weight: var(--font-weight-headings-heavy);
}

h3 {
  margin-block-start: 10px;
  font-size: var(--font-size-card-title);
  line-height: 18px;

  /* OG kept the title 14px below the bar's top edge (`#ondeck-shows .titles h3`). */
  .with-progress & {
    margin-block-start: calc(var(--space-under-progress-title) - var(--progress-under-height));
  }
}

.subtitle {
  margin-block-start: var(--space-card-subtitle);
  color: var(--color-card-subtitle);
  font-family: var(--font-headings);
  font-size: var(--font-size-card-subtitle);
  line-height: var(--line-height-card-subtitle);
}

.logo {
  position: absolute;
  inset: 0;
  inline-size: calc(100% - var(--calendar-logo-inset) * 2);
  max-block-size: 100%;
  margin: auto;
  object-fit: contain;
}
.calendar {
  padding-block-end: var(--calendar-card-bottom);
  border-block-end: 1px solid var(--color-frame-border);

  & .poster {
    border: 0;
  }
  & :global(.quick-icons) {
    border: 0;
    border-block-end: 1px solid var(--color-frame-border);
  }
  & .titles {
    margin: 0;
    padding-inline: var(--space-sm-inline);
  }
  & .titles-link {
    color: var(--color-frame-text);
  }
  & h3 {
    font-size: var(--calendar-title-size);
  }
  & .subtitle {
    color: var(--gray-lighter);
  }
}
</style>
