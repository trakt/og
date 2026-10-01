<!--
  Undo's confirmation. OG asked with the browser's confirm; og asks in its dialog, with OG's words and the
  counts the sync would take away.
-->
<script lang="ts">
import Dialog from '$lib/components/dialog/Dialog.svelte';
import { countLabel } from '$lib/utils/countLabel';
import type { SyncRow } from './toSyncRow';

interface Props {
  open: boolean;
  removes: SyncRow['removes'] | null;
  busy: boolean;
  onconfirm: () => void;
}

let { open = $bindable(), removes, busy, onconfirm }: Props = $props();

const LINES = [
  ['History', 'history'],
  ['Paused', 'paused'],
  ['Library', 'library'],
  ['Ratings', 'ratings'],
  ['Watchlist', 'watchlist'],
] as const;
</script>

<Dialog bind:open title="Undo Sync" size="md">
  <p>Undoing this data sync is permanent! The following items will be removed:</p>
  <ul>
    {#each LINES as [label, key] (key)}
      <li>{label}: {countLabel(removes?.[key] ?? 0, 'item')}</li>
    {/each}
  </ul>
  <p>Are you sure?</p>
  <div class="actions">
    <button type="button" onclick={() => (open = false)}>Cancel</button>
    <button type="button" class="undo" disabled={busy} aria-busy={busy} onclick={onconfirm}>Undo Sync</button>
  </div>
</Dialog>

<style>
ul {
  margin-block-end: var(--line-height-computed);
}

.actions {
  display: flex;
  justify-content: end;
  gap: var(--space-sm-inline);
}

.undo {
  border-color: var(--color-btn-primary-border);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>
