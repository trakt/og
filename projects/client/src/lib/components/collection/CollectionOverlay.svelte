<!--
  OG's library metadata over a poster: the format logo with 3D, resolution
  and HDR tags, a rule, then the audio codec logo over the channels. It fades in while the card is hovered or has
  focus. Render it in PosterCard's `cover` snippet; the card's text carries the same facts for screen readers.
    <CollectionOverlay badges={collectionBadges(row.metadata)} />
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import type { CollectionBadges, CollectionLogo } from './collectionBadges.ts';

const logos: Record<string, string> = import.meta.glob('../../icons/logos/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const { badges }: { badges: CollectionBadges } = $props();
// OG's per-logo sizes (`.logos-icon-bluray`, `.logos-icon-dolby_digital` and friends).
const WIDE = new Set(['bluray', 'vcd']);
const SMALL = new Set([
  'digital',
  'dolby_digital',
  'dolby_digital_plus',
  'dolby_prologic',
  'dolby_atmos',
  'dolby_truehd',
  'dts',
  'dts_ma',
  'dts_x',
]);
const svg = (name: string) => logos[`../../icons/logos/${name}.svg`];
</script>

{#snippet logo({ name }: CollectionLogo)}
  {@const glyph = svg(name)}
  {#if glyph}
    <span class={['item', 'logo', { wide: WIDE.has(name), small: SMALL.has(name) }]}><Icon svg={glyph} /></span><br />
  {/if}
{/snippet}

<div class="collection-overlay" aria-hidden="true">
  {#if badges.video}
    {@const { video } = badges}
    <div class="video">
      {#if video.logo}{@render logo(video.logo)}{/if}
      {#if video.threeD}<span class="item tag strong">3D</span>{/if}
      {#if video.resolution}<span class="item tag">{video.resolution}</span>{/if}
      {#if video.hdr}<span class="item tag">{video.hdr}</span>{/if}
    </div>
  {/if}
  {#if badges.audio}
    {@const { audio } = badges}
    <div class="audio">
      {#if audio.logo}{@render logo(audio.logo)}{/if}
      {#if audio.channels}<span class="item tag">{audio.channels}</span>{/if}
    </div>
  {/if}
</div>

<style>
.collection-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  padding-block-start: var(--collection-overlay-padding-top);
  background-color: var(--collection-overlay-bg);
  color: var(--collection-overlay-color);
  text-align: center;
  opacity: 0;
  transition: opacity 0.5s;

  :global(.poster-card:is(:hover, :focus-within)) & {
    opacity: 1;
  }
}

.video,
.audio {
  position: absolute;
  inset-inline: 10%;
}

.video {
  inset-block-end: 50%;
  padding-block-end: var(--collection-overlay-gap);
  border-block-end: 1px solid var(--collection-overlay-rule);
}

.audio {
  inset-block-start: 50%;
  padding-block-start: var(--collection-overlay-audio-gap);
}

.item {
  display: inline-block;
  margin: var(--collection-overlay-item-margin);
  font-size: var(--font-size-collection-logo);
  line-height: 1;
  vertical-align: middle;

  &.wide {
    font-size: var(--font-size-collection-logo-wide);
  }

  &.small {
    font-size: var(--font-size-collection-logo-small);
  }
}

.tag {
  margin-block-end: 0;
  color: var(--collection-overlay-tag);
  font-family: var(--font-headings);
  font-size: var(--font-size-collection-tag);
  font-weight: var(--font-weight-headings-light);

  &.strong {
    font-weight: var(--font-weight-headings-heavy);
  }
}
</style>
