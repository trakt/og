<!--
  The seasons band under a progress row: "+ view details" opens the row's panel (the up-next banner and the season
  strips, `ProgressPanel`). OG had "view seasons" and "view all"; the strips show every episode at once, so one toggle
  does both. OG's toggles were spans; this is a button that says whether it's open. The row reads the show's catalog
  as the panel opens, so the band says it's loading until the seasons are in.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import minus from '$lib/icons/solid/minus.svg?raw';
import plus from '$lib/icons/solid/plus.svg?raw';

interface Props {
  /** The panel's id, for `aria-controls`. */
  controls: string;
  /** The panel is open. */
  open?: boolean;
  /** The seasons are still loading. */
  loading?: boolean;
  /** The panel opened or closed. */
  ontoggle?: (open: boolean) => void;
}

let { controls, open = $bindable(false), loading = false, ontoggle }: Props = $props();

function setOpen(next: boolean) {
  open = next;
  ontoggle?.(next);
}
</script>

<div class="seasons">
  <button type="button" class="toggle" aria-expanded={open} aria-controls={controls}
    onclick={() => setOpen(!open)}><Icon svg={open ? minus : plus} />view details</button>

  {#if open && loading}<p class="loading" role="status">Loading seasons…</p>{/if}
</div>

<style>
/* `.seasons`: a band out to the column's gutters. */
.seasons {
  margin: var(--progress-seasons-margin);
  padding: var(--progress-seasons-padding);
  background-color: var(--color-progress-seasons-bg);
}

.loading {
  margin: var(--space-xs-block) 0 0;
  color: var(--color-text-muted);
  font-style: italic;
}

.toggle {
  display: inline;
  min-block-size: 0;
  margin: 0 var(--space-xs-inline) 0 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-progress-toggle-link);
  font: inherit;
  cursor: pointer;

  & :global(.icon) {
    margin-inline-end: 4px;
    font-size: var(--font-size-progress-toggle-icon);
  }

  &:focus-visible {
    outline: 2px solid var(--color-link);
    outline-offset: 1px;
  }
}

@media (width < 768px) {
  .seasons {
    margin: var(--progress-seasons-margin-phone);
    padding: var(--progress-seasons-padding-phone);
  }
}
</style>
