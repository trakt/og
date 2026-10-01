<!--
  OG's "Read Notes" label on a list poster: a
  shade over the poster's bottom with the label, whose tooltip shows the owner's notes. Hovering, focusing or clicking
  the label opens it, so touch can read them too. Place it over the poster (PosterCard's `posterOverlay`).
    <ReadNotes notes="Watch the director's cut:fire:" />
-->
<script lang="ts">
import CommentText from '$lib/components/comments/CommentText.svelte';
import { parseComment } from '$lib/components/comments/text/parseComment';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import memo from '$lib/icons/solid/memo.svg?raw';

const { notes }: { notes: string } = $props();
const blocks = $derived(parseComment(notes));
</script>

<div class="read-notes">
  <Tooltip toggle variant="notable">
    {#snippet trigger(tooltip)}
      <button type="button" class="label" {...tooltip}>Read Notes <Icon svg={memo} fixedWidth /></button>
    {/snippet}
    <CommentText {blocks} />
  </Tooltip>
</div>

<style>
/* The shade lets clicks through to the poster link under it; only the label takes them. */
.read-notes {
  position: absolute;
  inset: 0;
  z-index: 10;
  background-image: linear-gradient(to bottom, transparent 60%, var(--color-read-notes-shade) 100%);
  color: var(--color-text-inverse);
  text-align: center;
  pointer-events: none;
}

.label {
  position: absolute;
  inset-block-end: 10px;
  inset-inline-start: 0;
  inline-size: 100%;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-family: var(--font-headings);
  font-size: var(--font-size-read-notes);
  font-weight: normal;
  text-transform: uppercase;
  pointer-events: auto;
  cursor: pointer;

  & :global(.icon) {
    margin-inline-start: 5px;
  }
}
</style>
