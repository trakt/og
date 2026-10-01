<!--
  OG's small button inside a settings field (`.btn.btn-primary.btn-settings-inline`): "Upload Avatar", "Select your
  favorites". `top` adds OG's `.more-top` gap above it.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  id?: string;
  top?: boolean;
  onclick: () => void;
  children: Snippet;
}

const { id, top = false, onclick, children }: Props = $props();
</script>

<button type="button" class={{ top }} {id} {onclick}>{@render children()}</button>

<style>
button {
  min-block-size: 0;
  padding: var(--settings-inline-button-padding);
  border-color: var(--color-btn-primary-border);
  border-radius: var(--radius-settings-inline-button);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--line-height-base);
  text-transform: uppercase;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }

  &.top {
    margin-block-start: var(--settings-favorites-top);
  }
}
</style>
