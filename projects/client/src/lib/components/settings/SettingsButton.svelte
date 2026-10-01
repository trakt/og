<!--
  A settings tab's action button: OG's large uppercase `.btn-primary`, or `danger` for the danger zone's gray button
  with a red border that fills red on hover (`.btn-danger-zone`), which takes a leading icon.
    <SettingsButton variant="danger" icon={trash} onclick={ask}>Delete Account</SettingsButton>
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import type { Snippet } from 'svelte';

interface Props {
  variant?: 'primary' | 'danger';
  icon?: string;
  busy?: boolean;
  onclick: () => void;
  children: Snippet;
}

const { variant = 'primary', icon, busy = false, onclick, children }: Props = $props();
</script>

<button type="button" class={variant} disabled={busy} aria-busy={busy} {onclick}>
  {#if icon}<span class="icon"><Icon svg={icon} /></span>{/if}{@render children()}
</button>

<style>
button {
  padding: var(--settings-button-padding);
  border: 1px solid var(--color-btn-primary-border);
  border-radius: var(--radius-lg);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-dialog-submit);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}

.danger {
  border: var(--danger-zone-button-border) solid var(--color-danger-zone-button-border);
  background-color: var(--color-danger-zone-button-bg);

  &:is(:hover, :focus-visible) {
    background-color: var(--color-danger-zone-button-border);
  }
}

.icon {
  margin-inline-end: var(--settings-button-icon-gap);
}
</style>
