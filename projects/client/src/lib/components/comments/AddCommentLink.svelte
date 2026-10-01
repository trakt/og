<!--
  OG's green "Add comment" link (`a.new-comment-focus.main`): it opens the page's new comment form. The comments
  subnav puts the icon first, the summary's comments heading puts a thin circled plus after the text. Renders nothing
  when the page has no form: logged out, or banned from commenting.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import thinPlus from '$lib/icons/thin/circle-plus.svg?raw';
import addCircle from '$lib/icons/trakt/add-circle.svg?raw';
import { newComment } from './newComment.svelte.ts';

const { heading = false }: { heading?: boolean } = $props();
</script>

{#if newComment.available}
  <button type="button" class={['add-comment', { heading }]} aria-controls="new-comment"
  onclick={() => newComment.open()}>
    {#if heading}
      <span class="text">Add comment</span><Icon svg={thinPlus} />
    {:else}
      <Icon svg={addCircle} /><span class="text">Add comment</span>
    {/if}
  </button>
{/if}

<style>
.add-comment {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs-inline);
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-comment-add);
  font-family: var(--font-headings);
  font-size: var(--font-size-comment-icon);
  font-weight: var(--font-weight-headings-light);
  line-height: 1;
  transition: color 0.5s;

  &:is(:hover, :focus-visible) {
    color: var(--color-comment-add-hover);
  }
}

.text {
  font-size: var(--font-size-comment-meta);
  text-transform: uppercase;
}

.heading {
  margin-inline-end: var(--space-sm-inline);
  font-size: var(--font-size-comment-add-icon);
}
</style>
