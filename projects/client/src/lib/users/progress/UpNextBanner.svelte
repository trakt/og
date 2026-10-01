<!--
  The quiet up-next banner on top of an open progress row: the episode's still with a play button (Watch now, which
  opens the episode page), an "Up next" kicker with its tags, runtime and rating, the number and title, a one-line
  overview (the full text in its tooltip), then Check in and Mark watched. Mark watched uses your "watch" default
  date (now, release or unknown) and falls back to now; the overlay patch moves the row on to the next episode.
  Hovering or focusing the banner outlines its episode tile (`linked`), and the tile does the same back.
-->
<script lang="ts">
import { page } from '$app/state';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { login } from '$lib/auth/login';
import { userManager } from '$lib/auth/userManager';
import { checkin } from '$lib/components/checkin/checkin.svelte';
import { watchMedia } from '$lib/components/history/watchMedia';
import { toast } from '$lib/components/toast/toast.svelte';
import Icon from '$lib/icons/Icon.svelte';
import heart from '$lib/icons/solid/heart.svg?raw';
import play from '$lib/icons/solid/play.svg?raw';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import trakt from '$lib/icons/trakt/trakt.svg?raw';
import { overlay } from '$lib/overlay/overlay';
import type { ProgressUpNext } from './toProgressRow.ts';

interface Props {
  next: ProgressUpNext;
  /** Its episode tile is hovered or focused. */
  linked?: boolean;
  /** The banner is hovered or focused, or stops being. */
  onlink?: (on: boolean) => void;
}

const { next, linked = false, onlink }: Props = $props();
let busy = $state(false);

const settings = $derived(page.data.settings?.browsing);
const tags = $derived(
  settings?.hide_episode_type_tags ? next.tags.filter(({ kind }) => kind === 'primary') : next.tags,
);
// API: integer rating, so 7.9 is still rating-7. Like the quick icons, rating-0 falls back to rating-1's gray.
const ratingLevel = $derived(Math.min(Math.max(Math.trunc(next.rating ?? 1), 1), 10));

const request = (path: string, body?: unknown) =>
  rawApiFetch({
    fetch: authenticatedFetch({ manager: userManager() }),
    path,
    init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  });

async function markWatched() {
  if (busy) return;
  if (!(await userManager().getUser())?.access_token) return login();
  const preferred = settings?.watch_popup_action;
  busy = true;
  try {
    const saved = await watchMedia({
      target: { ...next.target, season: next.season },
      watchedAt: preferred === 'released' || preferred === 'unknown' ? preferred : 'now',
      overlay,
      request,
      notify: toast,
      // An episode target carries its own context, so there's no season to read.
      episodes: () => Promise.resolve([]),
    });
    if (saved) void overlay.refresh();
  } finally {
    busy = false;
  }
}
</script>

<!-- Episode pages are OG routes og hasn't all built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<article class={['banner', { linked }]} aria-labelledby="up-next-{next.target.id}"
  onpointerenter={() => onlink?.(true)} onpointerleave={() => onlink?.(false)}
  onfocusin={() => onlink?.(true)} onfocusout={() => onlink?.(false)}>
  <div class="still">
    {#if next.image}<img src={next.image} alt="" loading="lazy" decoding="async" />{/if}
    <a class="play" href={next.href} aria-label="Watch {next.number} now"><Icon svg={play} /></a>
  </div>

  <div class="text">
    <p class="line">
      <span class="kicker">Up next</span>
      {#if tags.length > 0}
        <span class="tags">
          {#each tags as tag (tag.text)}
            <span class="tag" style:--tag-color="var(--{tag.kind === 'primary' ? 'brand-primary' : `episode-${tag.kind}`})"
            >{tag.text}</span>
          {/each}
        </span>
      {/if}
      {#if next.runtime}<span class="runtime">{next.runtime}</span>{/if}
      {#if next.rating !== undefined}
        <span class="rating"><span class="heart" style:color="var(--rating-{ratingLevel})"><Icon svg={heart} /></span
          >{Math.trunc(next.rating * 10)}%</span>
      {/if}
    </p>
    <h4 class="title" id="up-next-{next.target.id}"><a href={next.href}>{next.number} {next.title}</a></h4>
    {#if next.overview}<p class="overview" title={next.overview}>{next.overview}</p>{/if}
  </div>

  <div class="actions">
    {#if !settings?.hide_watching_now}
      <button type="button" class="checkin" aria-haspopup="dialog"
        onclick={() => checkin.open({ type: 'episode', id: next.target.id })}><Icon svg={trakt} />Check in</button>
    {/if}
    <button type="button" aria-busy={busy} disabled={busy} onclick={markWatched}><Icon svg={check} />Mark watched</button>
  </div>
</article>

<style>
.banner {
  display: grid;
  grid-template-columns: var(--progress-banner-still) minmax(0, 1fr) auto;
  gap: var(--progress-banner-gap);
  align-items: center;
  padding: var(--progress-banner-padding);
  border-inline-start: var(--progress-banner-edge) solid var(--brand-primary);
  background-color: var(--color-progress-seasons-bg);

  &.linked {
    outline: var(--progress-cell-ring) solid var(--color-text);
    outline-offset: var(--progress-cell-hairline);
  }
}

.still {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: var(--color-card-bg);
  background-image: var(--image-placeholder-fanart);
  background-size: cover;

  & img {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }
}

.play {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: var(--progress-banner-play);
  block-size: var(--progress-banner-play);
  border-radius: 50%;
  background-color: var(--color-progress-banner-play-bg);
  box-shadow: 0 0 0 var(--progress-banner-play-ring) var(--color-progress-banner-play);
  color: var(--color-progress-banner-play);
  font-size: var(--progress-banner-play-icon);

  & :global(.icon) {
    margin-inline-start: var(--progress-banner-play-nudge);
  }
}

.text {
  display: grid;
  gap: var(--progress-banner-text-gap);
  min-inline-size: 0;
}

.line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--progress-banner-meta-gap);
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-headings);
}

.kicker {
  color: var(--brand-primary);
  letter-spacing: var(--progress-banner-kicker-spacing);
  text-transform: uppercase;
}

.tags {
  display: inline-flex;
  gap: var(--progress-banner-tag-gap);
}

.tag {
  padding: var(--progress-banner-tag-padding);
  background-color: var(--tag-color);
  color: var(--color-text-inverse);
  font-size: var(--font-size-card-tag);
  line-height: var(--line-height-headings);
}

.heart {
  margin-inline-end: var(--progress-inline-gap);
}

.title {
  margin: 0;
  font-family: var(--font-headings);
  font-size: var(--font-size-progress-banner-title);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-progress-banner-title);

  & a {
    color: var(--color-text);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.overview {
  margin: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: var(--font-size-progress-banner-overview);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  gap: var(--space-xs-inline);

  & button {
    display: inline-flex;
    gap: var(--progress-banner-action-gap);
    align-items: center;
    white-space: nowrap;
  }

  & .checkin {
    border-color: var(--color-btn-primary-border);
    background-color: var(--brand-primary);
    color: var(--color-text-inverse);

    &:is(:hover, :focus-visible) {
      background-color: var(--brand-primary-darken);
    }
  }
}

@container progress-panel (width < 640px) {
  .banner {
    grid-template-columns: var(--progress-banner-still-phone) minmax(0, 1fr);
  }

  .actions {
    grid-column: 1 / -1;
    flex-wrap: wrap;
  }
}
</style>
