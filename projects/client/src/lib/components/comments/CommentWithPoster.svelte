<!--
  A comment beside its item's poster, as on user comment pages: a
  poster, or an episode's screenshot with the show title under it, in OG's col-md-2 (col-sm-3) column. Phones drop the
  poster for a "Show: Title" line.
-->
<script lang="ts">
import type { ComponentProps, Snippet } from 'svelte';
import PosterCard from '../media/PosterCard.svelte';

interface Props {
  poster: ComponentProps<typeof PosterCard>;
  /** What phones show instead of the poster: "Breaking Bad: Pilot". */
  inlineTitle: string;
  /** The comment card. */
  children: Snippet;
}

const { poster, inlineTitle, children }: Props = $props();
</script>

<div class="comment-with-poster">
  <div class="poster">
    <PosterCard {...poster} />
  </div>
  <div class="comment">
    <p class="inline-title">{inlineTitle}</p>
    {@render children()}
  </div>
</div>

<style>
/* Bootstrap's row and columns: 10px padding each side, so the columns line up with the page's poster grids. */
.comment-with-poster {
  display: grid;
  grid-template-columns: 1fr 5fr;
  margin-inline: calc(var(--gutter) / -2);

  /* A deleted comment leaves its wrapper empty. */
  &:not(:has(.comment-wrapper)) {
    display: none;
  }

  & > div {
    min-inline-size: 0;
    padding-inline: calc(var(--gutter) / 2);
  }
}

.inline-title {
  display: none;
}

@media (max-width: 991px) {
  .comment-with-poster {
    grid-template-columns: 1fr 3fr;
  }
}

@media (max-width: 767px) {
  .comment-with-poster {
    grid-template-columns: 1fr;
  }

  .poster {
    display: none;
  }

  .inline-title {
    display: block;
    margin: 0;
    padding: 5px 7px;
    background-color: var(--color-comment-inline-title);
    font-size: var(--font-size-small);
  }
}
</style>
