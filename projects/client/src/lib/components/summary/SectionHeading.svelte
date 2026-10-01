<!--
  A summary section's heading : "Comments" with "All 12 Comments",
  "Lists" with "All 3 Lists".
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import SeeMore from '$lib/components/see-more/SeeMore.svelte';

interface Props {
  title: string;
  id?: string;
  more?: { readonly href: string; readonly text: string };
  /** Links before the see-more one, like the comments' "Add comment". */
  actions?: Snippet;
}

const { title, id, more, actions }: Props = $props();
</script>

<div class="heading">
  <h2 {id}>{title}</h2>
  {#if actions}<span class="actions">{@render actions()}</span>{/if}
  {#if more}<SeeMore href={more.href} text={more.text} />{/if}
</div>

<style>
.heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-block-start: var(--gutter);

  & h2 {
    margin: 0;
  }
}

.actions {
  margin-inline-start: auto;
}
</style>
