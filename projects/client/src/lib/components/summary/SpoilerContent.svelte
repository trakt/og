<script lang="ts">
import type { Snippet } from 'svelte';
import type { Attachment } from 'svelte/attachments';
const { hidden, inline = false, children }: { hidden: boolean; inline?: boolean; children: Snippet } = $props();
let revealed = $state(false);
const blurred = $derived(hidden && !revealed);
const focusRevealed: Attachment<HTMLElement> = (element) => {
  if (revealed) element.focus({ preventScroll: true });
};
</script>
{#if hidden}
  <svelte:element this={inline ? 'span' : 'div'} class={['spoiler-content', { inline }]} tabindex="-1"
  {@attach focusRevealed}>
  <svelte:element this={inline ? 'span' : 'div'} class={{ blurred }} inert={blurred}
    aria-hidden={blurred}>{@render children()}</svelte:element>
  {#if blurred}<button type="button" aria-label="Click to reveal spoilers" title="Click to reveal"
    onclick={()=>revealed=true}></button>
  {/if}
</svelte:element>
{:else}
  {@render children()}
{/if}
<style>
.spoiler-content {
  position: relative;
  &.inline {
    display: inline-block;
  }
}
.blurred {
  filter: var(--blur-spoiler);
}
button {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  border: 0;
  background: transparent;
  color: var(--color-link);
  font: inherit;
  cursor: pointer;
}
</style>
