<!--
  OG's `.alert.inline-notice`: a rounded line with an icon on the left. Blue (`alert-info`) unless `tone` says
  `success`, OG's green one ("You've imported data 7 times.").
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import type { Snippet } from 'svelte';
const { svg, tone = 'info', children }: { svg?: string; tone?: 'info' | 'success'; children: Snippet } = $props();
</script>
<p class={['notice', tone]}>{#if svg}<span class="symbol"><Icon {svg} /></span>{/if}{@render children()}</p>
<style>
.notice {
  display: flex;
  align-items: center;
  margin: 0;
  padding: var(--notice-padding);
  border-radius: var(--notice-radius);
  background: var(--brand-info);
  color: var(--color-text-inverse);
  font-size: var(--font-size-settings-alert);

  &.success {
    background: var(--brand-success);
  }
}
/* OG's `.alert.inline-notice a:not(.btn)`: white with a dotted rule that goes solid on hover. */
.notice :global(a) {
  border-block-end: 1px dotted var(--color-text-inverse);
  color: var(--color-text-inverse);
  text-decoration: none;
  transition: border-color 0.5s;

  &:is(:hover, :focus-visible) {
    border-block-end: 1px solid var(--color-notice-link-hover);
  }
}
.symbol {
  display: inline-flex;
  margin-inline: var(--notice-icon-margin);
  font-size: var(--notice-icon-size);
  vertical-align: middle;
  line-height: 1;
}
</style>
