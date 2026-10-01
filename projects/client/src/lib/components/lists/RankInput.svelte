<!--
  OG's editable rank pill in reorder and manage modes (`editRank` in `lists.js`): it shows the rank over the top edge
  of the nearest positioned ancestor, like RankPill. Focusing it selects the number; Enter or blur moves the item
  there, and Escape backs out. `focus()` lets a "Change position" icon start the edit.
    <RankInput name="Heat" rank={3} onmove={(rank) => move(item, rank)} />
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';

interface Props {
  name: string;
  rank: number;
  busy?: boolean;
  onmove: (rank: number) => void;
}

const { name, rank, busy = false, onmove }: Props = $props();
let input = $state<HTMLInputElement>();
let draft = $state('');
let editing = $state(false);

export function focus() {
  input?.focus();
}

const commit = () => {
  if (!editing) return;
  editing = false;
  if (/^\d+$/.test(draft.trim())) onmove(Number(draft));
};
const begin = (event: FocusEvent) => {
  draft = String(rank);
  editing = true;
  if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.select();
};
</script>

<Tooltip text={editing ? 'Enter a number and press enter' : 'Change position'}>
  {#snippet trigger(tooltip)}
    <input bind:this={input} class="rank" type="text" inputmode="numeric" aria-label="Position of {name}"
      value={editing ? draft : rank} disabled={busy} {...tooltip} onfocus={begin}
      oninput={(event) => draft = event.currentTarget.value} onblur={commit}
      onkeydown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); commit(); input?.blur(); }
        if (event.key === 'Escape') { editing = false; input?.blur(); }
      }} />
  {/snippet}
</Tooltip>

<style>
.rank {
  position: absolute;
  inset-block-start: var(--list-reorder-rank-offset);
  inset-inline-start: 50%;
  z-index: 2;
  translate: -50% 0;
  field-sizing: content;
  min-inline-size: var(--list-reorder-rank-size);
  min-block-size: 0;
  block-size: var(--list-reorder-rank-size);
  padding: 0 var(--space-xs-inline);
  border: var(--list-reorder-rank-border) solid var(--color-rank-border);
  border-radius: var(--list-reorder-rank-radius);
  background: var(--gray-dark);
  color: var(--color-card-text);
  font: bold var(--font-size-card-tag) / 1.6 var(--font-body);
  text-align: center;
  transition: transform var(--transition-card);
}
.rank:focus {
  transform: scale(var(--list-reorder-rank-scale));
  background: var(--brand-primary);
  border-color: var(--color-input-border-focus);
}
.rank:focus-visible {
  outline: var(--list-reorder-rank-border) solid var(--color-input-border-focus);
  outline-offset: var(--list-reorder-rank-border);
}
@media (prefers-reduced-motion: reduce) {
  .rank {
    transition: none;
  }
}
</style>
