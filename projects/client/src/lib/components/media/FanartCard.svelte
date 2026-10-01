<!--
  OG's fanart card: a 16:9 fanart with tags and the title over its bottom-left corner,
  then the full-size quick-icon bar. Charts and the dashboard lay these out in a PosterGrid. With a `logo`, the fanart
  dims behind it, like OG's `image_type: 'logo'` on the calendars. The `poster` variant is OG's `image_type: 'poster'`
  with `search_mode` (the search grid): the same card at the poster ratio, with the small quick-icon bar. An `avatar`
  is OG's user card on the Users search tab: the round avatar centered over the dimmed cover.
-->
<script lang="ts">
import MediaSpoiler from '$lib/components/summary/MediaSpoiler.svelte';
import type { SpoilerTarget } from '$lib/settings/SpoilerTarget';
import { mediaSpoilers } from '$lib/settings/mediaSpoilers';
import { page } from '$app/state';
import { overlay } from '$lib/overlay/overlay';
import { formatDate } from '$lib/utils/formatDate';
import type { ComponentProps, Snippet } from 'svelte';
import EpisodeTypeBadge from './EpisodeTypeBadge.svelte';
import CornerRating from './CornerRating.svelte';
import DroppedBadge from './DroppedBadge.svelte';
import QuickIcons from './QuickIcons.svelte';

type Tag = {
  text: string;
  /** OG's h4 classes over a fanart. `primary` is the brand red; the `series-premiere` to `series-finale` kinds are
   * OG's `episode-type-*` colors. */
  kind?:
    | 'primary'
    | 'premiere'
    | 'generic'
    | 'collect'
    | 'list'
    | 'favorite'
    | 'subscribe'
    | 'series-premiere'
    | 'season-premiere'
    | 'mid-season-premiere'
    | 'mid-season-finale'
    | 'season-finale'
    | 'series-finale';
};

interface Props {
  href: string;
  title: string;
  /** Shown lighter after the title, like OG's `item_year_title`. */
  year?: number;
  /** An episode's "3x03", bold before the title. */
  number?: string;
  /** The show above an episode title. OG hid it when the logo already names the show. */
  smallTitle?: { text: string; href: string };
  /** Worded artwork already names the show. */
  hideSmallTitle?: boolean;
  image?: string;
  /** Show artwork replaces an unwatched episode screenshot, as in OG. */
  spoilerImage?: string;
  /** A logo over the dimmed fanart. */
  logo?: string;
  /** A user's avatar, round over the dimmed image (OG's `.avatar-wrapper`). */
  avatar?: string;
  /** Keep OG's logo-mode dimming when the API has no logo. */
  logoMode?: boolean;
  /** Thumb, banner and poster artwork put compact titles above the image. */
  worded?: boolean;
  /** Small labels above the title: "50 watchers", "Series Premiere". */
  tags?: readonly Tag[];
  /** The viewer's own rating, 1 to 10. */
  userRating?: number | null;
  /** ID result episodes use OG's ribbon over the artwork. */
  episodeBadge?: ComponentProps<typeof EpisodeTypeBadge>;
  /** A show the viewer dropped: greyed out under a dropped badge. */
  dropped?: boolean;
  /** Dimmed by the fade menu until hovered or focused (OG's `.grid-item.fade-*-on`). */
  faded?: boolean;
  /** Off when the title sits beside the card instead (OG's `.row.fanarts` hides `.titles`). */
  titles?: boolean;
  /** The poster already names it: the title stays for screen readers and the keyboard only. */
  hideTitle?: boolean;
  variant?: 'fanart' | 'poster' | 'banner';
  /** Left out, the card has no quick-icon bar. */
  icons?: Omit<ComponentProps<typeof QuickIcons>, 'small'>;
  /** Over the whole image, above the titles: the progress row's Next Episode cover. */
  fanartOverlay?: Snippet;
}

const {
  href,
  title,
  year,
  number,
  smallTitle,
  hideSmallTitle = false,
  image,
  spoilerImage,
  logo,
  avatar,
  logoMode = !!logo,
  worded = false,
  tags = [],
  userRating,
  episodeBadge,
  dropped = false,
  faded = false,
  titles = true,
  hideTitle = false,
  variant = 'fanart',
  icons,
  fanartOverlay,
}: Props = $props();
const target = $derived(icons?.hideTarget ?? icons?.ratingTarget ?? icons?.watchTarget ?? icons?.listTarget);
const spoilerTarget: SpoilerTarget | undefined = $derived(icons?.collectionTarget ?? icons?.watchTarget ?? target);
const state = $derived(target ? overlay.state(target.type, target.id) : undefined);
const hideScreenshot = $derived(
  spoilerTarget && page.data.user
    ? mediaSpoilers({
      spoilers: page.data.settings?.browsing?.spoilers,
      type: spoilerTarget.type,
      watched: overlay.state(spoilerTarget.type, spoilerTarget.id, spoilerTarget.season).watched,
    }).screenshot
    : false,
);
// Other episode card modes already use safe show posters, banners or logos.
const screenshotArtwork = $derived(spoilerImage !== undefined || image?.includes('/screenshots/'));
const shownImage = $derived(hideScreenshot && screenshotArtwork ? spoilerImage : image);
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

<article hidden={hidden} class={['fanart-card', { dropped: isDropped && image, faded }]}>
  <div class={['fanart', variant, { 'logo-mode': logoMode, worded }]}>
    <!-- The title link is the one in the tab order; this is the same link for the mouse. -->
    <a class="image-link" {href} tabindex="-1" aria-hidden="true">
      {#if shownImage}
        <img class="image" src={shownImage} alt="" loading="lazy" decoding="async" />
      {:else}
        <span class="image"></span>
      {/if}
      {#if logo}
        <img class="logo" src={logo} alt="" loading="lazy" decoding="async" />
      {/if}
      {#if avatar}
        <span class="avatar-wrapper"><img class="avatar" src={avatar} alt="" loading="lazy" decoding="async" /></span>
      {/if}
      <span class="shadow-base"></span>
    </a>
    {#if episodeBadge}<EpisodeTypeBadge {...episodeBadge} />{/if}
    {#if isDropped && image}<DroppedBadge target={restoreTarget} date={state?.droppedAt ? formatDate(state.droppedAt, page.data.datePreferences) : undefined} />{/if}
    {#if userRating}
      <CornerRating rating={userRating} />
    {/if}
    {#if titles}
    <div class="titles">
      {#each tags as tag, i (i)}
        <p class={['tag', tag.kind ?? 'primary']}>{tag.text}</p>
      {/each}
      {#if smallTitle && !logo && !hideSmallTitle}
        <a class="titles-link small-title" href={smallTitle.href}>{smallTitle.text}</a>
      {/if}
      <div class={['title-wrapper', { 'hidden-title': hideTitle }]}>
        <h3>{#if number}<a class="titles-link" {href}><span class="number">{number}</span></a> {/if}<MediaSpoiler target={spoilerTarget} kind="title" inline><a class="titles-link" {href}>{title}</a></MediaSpoiler>{#if year}<span class="year">{year}</span>{/if}</h3>
      </div>
    </div>
    {/if}
    {@render fanartOverlay?.()}
  </div>
  {#if icons}
    <QuickIcons {...icons} small={variant === 'poster'} />
  {/if}
</article>

<style>
.fanart-card[hidden] {
  display: none;
}

.fanart-card {
  min-inline-size: 0;
  transition: opacity 0.5s;

  &.faded:not(:hover, :focus-within) {
    opacity: var(--opacity-faded);
  }
}

.fanart {
  position: relative;
  overflow: hidden;
  background-color: var(--color-card-bg);
}

.image-link {
  display: block;
}

.image {
  display: block;
  inline-size: 100%;
  aspect-ratio: var(--ratio-fanart);
  object-fit: cover;

  .poster & {
    aspect-ratio: var(--ratio-poster);
  }

  .banner & {
    aspect-ratio: var(--ratio-banner);
  }

  .dropped & {
    filter: grayscale(1);
  }

  .logo-mode & {
    opacity: var(--opacity-fanart-behind-logo);
  }
}

.logo {
  position: absolute;
  inset-block-start: 10%;
  inset-inline: 0;
  block-size: 50%;
  margin-inline: auto;
  max-inline-size: 100%;
  object-fit: contain;
}

.avatar-wrapper {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background-color: var(--color-fanart-avatar-shade);
}

.avatar {
  inline-size: var(--fanart-avatar-size);
  block-size: var(--fanart-avatar-size);
  border: var(--fanart-avatar-border) solid var(--color-fanart-avatar-ring);
  border-radius: 50%;
  background-color: var(--color-fanart-avatar-ring);
  object-fit: cover;
}

.shadow-base {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  block-size: 100px;
  background: var(--gradient-shadow-base);
}

.titles {
  position: absolute;
  inset-block-end: 10px;
  inset-inline: 12px;
}

.worded {
  & .shadow-base {
    display: none;
  }
  & .titles {
    inset-block: var(--space-lg-block) auto;
    inset-inline: 0;
    block-size: 0;
  }
  & h3,
  & .small-title {
    position: absolute;
    inset-inline-start: 0;
    margin: var(--space-sm-block) 0 0;
    padding: var(--calendar-worded-padding);
    background: var(--color-frame);
    color: var(--color-frame-text);
    font-size: var(--font-size-card-subtitle);
  }
  & h3 {
    inset-block-start: var(--calendar-worded-title-top);
  }
  & .small-title {
    inset-block-start: var(--calendar-worded-small-title-top);
  }
}

.tag {
  display: inline-block;
  margin: 0 5px 5px 0;
  padding: 3px 5px;
  background-color: var(--tag-color);
  color: var(--color-card-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  font-size: var(--font-size-card-tag);
  line-height: var(--line-height-headings);
}

.primary {
  --tag-color: var(--brand-primary);
}

.premiere {
  --tag-color: var(--episode-season-premiere);
}

.generic {
  --tag-color: var(--gray);
}

.collect {
  --tag-color: var(--brand-quaternary);
}

.list {
  --tag-color: var(--brand-fifth);
}

.favorite {
  --tag-color: var(--brand-seventh);
}

.subscribe {
  --tag-color: var(--brand-eighth);
}

.series-premiere {
  --tag-color: var(--episode-series-premiere);
}

.season-premiere {
  --tag-color: var(--episode-season-premiere);
}

.mid-season-premiere {
  --tag-color: var(--episode-mid-season-premiere);
}

.mid-season-finale {
  --tag-color: var(--episode-mid-season-finale);
}

.season-finale {
  --tag-color: var(--episode-season-finale);
}

.series-finale {
  --tag-color: var(--episode-series-finale);
}

.titles-link {
  display: inline;
  color: var(--color-card-text);
  text-decoration: none;

  &:is(:hover, :focus-visible) {
    color: var(--color-card-text);
    text-decoration: underline;
  }
}

/* Back in view while it has keyboard focus, so the focus stays visible. */
.hidden-title:not(:focus-within) {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.small-title {
  display: block;
  margin-block-end: 5px;
  color: var(--gray-lighter);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  font-size: var(--font-size-h5);
  line-height: var(--line-height-headings);
  text-shadow: var(--text-shadow-headings);
}

h3 {
  margin: 0;
  font-weight: var(--font-weight-headings);
  font-size: var(--font-size-fanart-title);
  text-shadow: var(--text-shadow-headings);
}

.number {
  font-weight: var(--font-weight-headings-heavy);
}

.year {
  margin-inline-start: 0.25em;
  color: var(--gray-lightish);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-base);
}
span.image {
  background-image: var(--image-placeholder-fanart);
  background-size: cover;
  .poster & {
    background-image: var(--image-placeholder-poster);
  }
  .banner & {
    background-image: var(--image-placeholder-banner);
  }
}
</style>
