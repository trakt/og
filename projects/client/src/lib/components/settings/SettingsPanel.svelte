<!--
  One settings panel: a gray uppercase heading with a
  minus-square icon that folds the panel, then its body. OG made the whole heading clickable; og puts a disclosure
  button in the h2 so the keyboard can fold it too. `id` is the sidebar's anchor, and the panel stops below the fixed
  header when a link or the URL's hash jumps to it. `extra` (a `SettingsPanelLink`) and the VIP label sit at the
  heading's end, outside the button.
-->
<script lang="ts">
import VipLabel from '$lib/components/labels/VipLabel.svelte';
import Icon from '$lib/icons/Icon.svelte';
import minus from '$lib/icons/thin/square-minus.svg?raw';
import plus from '$lib/icons/thin/square-plus.svg?raw';
import type { Snippet } from 'svelte';

interface Props {
  id: string;
  title: string;
  /** Starts folded (OG's Appearance panel for non-VIPs). */
  collapsed?: boolean;
  /** Flush instruction bands instead of the usual top padding. */
  instructions?: boolean;
  /** OG's VIP label, for a VIP-only panel. */
  vip?: boolean;
  extra?: Snippet;
  children: Snippet;
}

const { id, title, collapsed = false, instructions = false, vip = false, extra, children }: Props = $props();
// svelte-ignore state_referenced_locally
let open = $state(!collapsed);
</script>

<section {id} class={['panel', { collapsed: !open, instructions }]} aria-labelledby="{id}-heading">
  <h2 class="heading">
    <button type="button" id="{id}-heading" aria-expanded={open} aria-controls="{id}-body" onclick={() => (open = !open)}>
      <Icon svg={open ? minus : plus} />{title}
    </button>
    {#if extra || vip}
      <span class="extra">
        {#if extra}{@render extra()}{/if}
        {#if vip}<span class="vip"><VipLabel badge={{ kind: 'vip', tag: null, years: null }} /></span>{/if}
      </span>
    {/if}
  </h2>
  <div class="body" id="{id}-body" hidden={!open}>
    {@render children()}
  </div>
</section>

<style>
.panel {
  margin-block-end: var(--gutter);
  border: 1px solid var(--color-data-panel-border);
  background-color: var(--color-data-panel-bg);
  box-shadow: var(--shadow-settings-panel);
  scroll-margin-block-start: calc(var(--header-height) + var(--settings-scroll-gap));
}

.heading {
  display: flex;
  align-items: center;
  margin: 0;
  border-block-end: 1px solid var(--color-data-panel-border);
  background-color: var(--color-data-panel-header-bg);
  color: var(--color-data-panel-heading);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--line-height-base);
  text-transform: uppercase;

  .collapsed & {
    border-block-end: 0;
  }
}

button {
  flex: 1;
  min-block-size: 0;
  padding: var(--settings-panel-heading-padding);
  border: 0;
  border-radius: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  text-transform: inherit;
  cursor: row-resize;

  & :global(.icon) {
    margin-inline-end: var(--settings-panel-icon-gap);
  }
}

.extra {
  display: flex;
  align-items: flex-start;
  align-self: stretch;
  padding-block-start: var(--settings-panel-heading-padding);
  padding-inline-end: var(--settings-panel-heading-padding);
}

.vip {
  display: flex;
  margin: var(--settings-panel-vip-margin);
}

.body {
  padding: var(--settings-panel-body-padding);

  .instructions & {
    padding: 0 0 var(--settings-instruction-body-bottom);

    /* Stacked fields on a phone would touch the panel's edges. */
    @media (max-width: 767px) {
      padding-inline: var(--settings-instruction-phone-inline);
    }
  }
}
</style>
