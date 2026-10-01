<!--
  The four boxes under a profile's frame: About Me, Last Watched, watch
  time for the last 30 days and all time, and the featured list. Four across, two from tablet width, one on phones.
-->
<script lang="ts">
import CommentText from '$lib/components/comments/CommentText.svelte';
import { parseComment } from '$lib/components/comments/text/parseComment';
import Container from '$lib/components/container/Container.svelte';
import posterBg from '$lib/assets/poster-bg.jpg';
import type { LastWatched, WatchedTotals } from '$lib/users/profile/toProfileSummary';
import { countLabel } from '$lib/utils/countLabel';
import { formatRuntime } from '$lib/utils/formatRuntime';

type Totals = { readonly episodes: WatchedTotals; readonly movies: WatchedTotals };

interface Props {
  about: string | null;
  lastWatched: LastWatched | null;
  recent: Totals;
  allTime: Totals;
  featured: { readonly name: string; readonly href: string; readonly empty: boolean; readonly image?: string };
}

const { about, lastWatched, recent, allTime, featured }: Props = $props();
const blocks = $derived(parseComment(about ?? ''));
</script>

<!-- The profile's subpages aren't all built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet placeholder()}
  <span class="placeholder" style:background-image="url({posterBg})"></span>
{/snippet}

{#snippet totals(label: string, { episodes, movies }: Totals)}
  <p class="chips"><span class="chip">{label}</span><span class="chip alt">Watched</span></p>
  <p class="totals">
    <strong>Shows —</strong>
    {formatRuntime(episodes.minutes)}
    {#if episodes.unique > 0}<em class="count">({countLabel(episodes.unique, 'ep')})</em>{/if}
    <br />
    <strong>Movies —</strong>
    {formatRuntime(movies.minutes)}
    {#if movies.unique > 0}<em class="count">({countLabel(movies.unique, 'movie')})</em>{/if}
  </p>
{/snippet}

<section class="boxes" aria-label="Stats">
  <Container>
    <div class="grid">
      <div class="box about">
        <p class="chips spaced"><span class="chip">About Me</span></p>
        <!-- Focusable because it scrolls, so the keyboard can reach it. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="about-text" role="region" aria-label="About Me" tabindex="0">
          <CommentText {blocks} />
        </div>
      </div>

      <div class={['box', { empty: !lastWatched }]}>
        {#if lastWatched}
          {#if lastWatched.image}<img class="fanart" src={lastWatched.image} alt="" decoding="async" />{/if}
        {:else}
          {@render placeholder()}
        {/if}
        <div class="bottom">
          <p class="chips"><span class="chip">Last Watched</span></p>
          {#if lastWatched}
            <a href={lastWatched.title.href}><h3>{lastWatched.title.text}</h3></a>
            {#if lastWatched.episode}<a href={lastWatched.episode.href}><h4>{lastWatched.episode.text}</h4></a>{/if}
          {:else}
            <h3>Nothing watched yet!</h3>
          {/if}
        </div>
      </div>

      <div class="box stats">
        <div class="stats-content">
          {@render totals('Last 30 Days', recent)}
          <div class="more-top">{@render totals('All Time', allTime)}</div>
        </div>
      </div>

      <div class={['box', { empty: featured.empty }]}>
        {#if featured.empty}
          {@render placeholder()}
        {:else if featured.image}
          <img class="fanart" src={featured.image} alt="" decoding="async" />
        {/if}
        <div class="bottom">
          <p class="chips"><span class="chip">Featured List</span></p>
          <a href={featured.href}><h3>{featured.name}</h3></a>
        </div>
      </div>
    </div>
  </Container>
</section>

<style>
.boxes {
  background-color: var(--color-profile-boxes-bg);
  color: var(--color-card-text);

  a {
    color: inherit;
    text-decoration: none;

    &:is(:hover, :focus-visible) {
      text-decoration: underline;
    }
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 991px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
    margin-inline: calc(var(--gutter) / -2);
  }
}

.box {
  position: relative;
  overflow: hidden;
  block-size: var(--profile-box-height);
  padding-inline: var(--profile-box-padding);
  background-color: var(--color-card-bg);

  /* OG's .shade over the image: clear at the top, near black at the bottom. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background-image: var(--gradient-profile-box-shade);
  }

  &.empty::before {
    background-image: none;
  }
}

.fanart,
.placeholder {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.placeholder {
  background-color: var(--color-profile-placeholder-bg);
  background-size: var(--profile-placeholder-size);
  opacity: var(--opacity-profile-placeholder);
  filter: blur(var(--profile-placeholder-blur));
}

.about::before {
  background-image: var(--gradient-profile-about);
}

.stats::before {
  background-image: var(--gradient-profile-stats);
}

.about > *,
.stats-content {
  position: relative;
  z-index: 2;
}

.about .chips {
  margin-block-start: var(--profile-box-padding);
}

.about-text {
  max-block-size: var(--profile-about-max-height);
  margin-inline-end: calc(-1 * var(--profile-box-padding));
  padding-inline-end: var(--profile-box-padding);
  overflow-y: auto;
  overflow-wrap: anywhere;
}

.bottom {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  z-index: 2;
  padding: 0 var(--profile-box-padding) var(--profile-box-padding);

  .chip {
    background-color: var(--color-profile-chip-alt);
  }
}

h3,
h4 {
  margin: 0;
  color: inherit;
  text-shadow: var(--text-shadow-headings);
}

h3 {
  font-size: var(--font-size-profile-box-title);
  font-weight: var(--font-weight-headings);
}

h4 {
  margin-block-start: 3px;
  font-size: var(--font-size-profile-box-subtitle);
  font-weight: var(--font-weight-headings-light);
}

.chips {
  display: flex;
  gap: 5px;
  margin: 0 0 5px;

  &.spaced {
    margin-block-end: var(--space-lg-block);
  }
}

.chip {
  padding: var(--profile-chip-padding);
  border-radius: var(--radius-profile-chip);
  background-color: var(--color-profile-chip);
  font-family: var(--font-headings);
  font-size: var(--font-size-profile-chip);
  font-weight: var(--font-weight-headings);
  line-height: 1;

  &.alt {
    background-color: var(--color-profile-chip-alt);
  }
}

.stats-content {
  position: absolute;
  inset-block-start: 50%;
  translate: 0 -50%;
}

.totals {
  margin: 0;
}

.more-top {
  margin-block-start: 15px;
}

.count {
  color: var(--color-profile-play-count);
  font-size: var(--font-size-profile-chip);
}
</style>
