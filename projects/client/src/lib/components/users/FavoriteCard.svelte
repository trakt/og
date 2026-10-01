<!--
  One of a profile's three favorites: the poster on a gradient of its own
  colors, then the title, type and year chips, and the owner's note.
-->
<script lang="ts">
import CommentText from '$lib/components/comments/CommentText.svelte';
import { parseComment } from '$lib/components/comments/text/parseComment';
import type { FavoriteCard } from '$lib/users/profile/toProfileSummary';

const { favorite }: { favorite: FavoriteCard } = $props();
const blocks = $derived(parseComment(favorite.notes ?? ''));
</script>

<!-- Media routes are mapped from the API's canonical slugs. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<article
  class="favorite"
  style:background-image="linear-gradient(to bottom right, {favorite.gradient[0]}, {favorite.gradient[1]})"
>
  <!-- The title link is the one in the tab order; this is the same link for the mouse. -->
  <a class="poster" href={favorite.href} tabindex="-1" aria-hidden="true">
    {#if favorite.image}
      <img src={favorite.image} alt="" loading="lazy" decoding="async" />
    {:else}
      <span class="image"></span>
    {/if}
  </a>
  <div class="info">
    <a class="title" href={favorite.href}><h3>{favorite.title}</h3></a>
    <p class="chips">
      <span class="chip type">{favorite.typeLabel}</span>
      {#if favorite.year}<span class="chip">{favorite.year}</span>{/if}
    </p>
    {#if blocks.length > 0}
      <div class="notes">
        <CommentText {blocks} />
      </div>
    {/if}
  </div>
</article>

<style>
.favorite {
  display: flex;
  border-radius: var(--radius-favorite);
  color: var(--color-card-text);
}

.poster {
  /* 30% of the whole card, like OG's floated poster. */
  flex: 0 0 var(--favorite-poster-width);
  align-self: start;
  margin: var(--favorite-padding);
  box-shadow: var(--shadow-favorite-poster);

  img,
  .image {
    display: block;
    inline-size: 100%;
    aspect-ratio: var(--ratio-poster);
    object-fit: cover;
    background-color: var(--color-card-bg);
  }
}

.info {
  flex: 1;
  min-inline-size: 0;
  /* OG capped it at the poster's height and let the note scroll: size containment keeps a long note from growing
     the card. */
  contain: size;
  overflow-y: auto;
  margin-block: var(--favorite-padding);
  padding-inline-end: var(--favorite-padding);
}

.title {
  color: inherit;
  text-decoration: none;

  &:is(:hover, :focus-visible) {
    text-decoration: underline;
  }
}

h3 {
  margin: 0;
  color: inherit;
  font-size: var(--font-size-favorite-title);
  font-weight: var(--font-weight-headings-heavy);
  line-height: 1;
}

.chips {
  display: flex;
  gap: 5px;
  margin: 5px 0 0;
}

.chip {
  padding: var(--profile-chip-padding);
  border-radius: var(--radius-profile-chip);
  background-color: var(--color-profile-chip-alt);
  font-family: var(--font-headings);
  font-size: var(--font-size-profile-chip);
  font-weight: var(--font-weight-headings);
  line-height: 1;

  &.type {
    background-color: var(--color-favorite-type);
  }
}

.notes {
  padding-block-start: 15px;
  overflow-wrap: anywhere;
}
</style>
