<!--
  OG's manage-mode edit icons on a list poster: a shade over the poster with drag, change position, move first, move last,
  delete and notes along its bottom. Place it over the poster (PosterCard's `posterOverlay`) with a RankInput.
  The drag handle takes the arrow keys too, so reordering doesn't need a pointer.
    <ListItemEdit name="Heat" rank={3} total={12} notes draggable changeRank={false} onmove={(to) => move(item, to)}
      ondrag={startDrag} onchangerank={focusRank} onremove={remove} onnotes={openNotes} />
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import drag from '$lib/icons/solid/arrows-up-down-left-right.svg?raw';
import first from '$lib/icons/solid/angles-up.svg?raw';
import last from '$lib/icons/solid/angles-down.svg?raw';
import listOl from '$lib/icons/solid/list-ol.svg?raw';
import memo from '$lib/icons/solid/memo.svg?raw';
import xmark from '$lib/icons/solid/xmark-large.svg?raw';

interface Props {
  name: string;
  rank: number;
  /** Items on the whole list: "Move last" goes there. */
  total: number;
  /** The item has notes: the notes icon reads "Edit notes" and lights up. */
  notes: boolean;
  /** Show the drag handle: OG only dragged a ranked list that fits one page. */
  draggable: boolean;
  /** Show "Change position": OG's other sorts, where the rank pill isn't the obvious control. */
  changeRank: boolean;
  busy?: boolean;
  onmove: (rank: number) => void;
  ondrag: (event: PointerEvent) => void;
  onchangerank: () => void;
  onremove: () => void;
  onnotes: () => void;
}

const {
  name,
  rank,
  total,
  notes,
  draggable,
  changeRank,
  busy = false,
  onmove,
  ondrag,
  onchangerank,
  onremove,
  onnotes,
}: Props = $props();

const STEPS: Readonly<Record<string, number>> = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };
</script>

<div class="list-edit">
  <div class="icons">
    {#if draggable}
      <Tooltip text="Drag to reorder">
        {#snippet trigger(tooltip)}
          <button type="button" class="drag" aria-label="Drag to reorder {name}"
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight" aria-disabled={busy} {...tooltip}
            onpointerdown={ondrag} onkeydown={(event) => {
              const step = STEPS[event.key];
              if (busy || !step) return;
              event.preventDefault();
              onmove(rank + step);
            }}><Icon svg={drag} /></button>
        {/snippet}
      </Tooltip>
    {/if}
    {#if changeRank}{@render action('Change position', listOl, onchangerank)}{/if}
    {@render action('Move first', first, () => onmove(1), rank === 1)}
    {@render action('Move last', last, () => onmove(total), rank === total)}
    {@render action('Delete', xmark, onremove)}
    {@render action(notes ? 'Edit notes' : 'Add notes', memo, onnotes, false, 'notes')}
  </div>
</div>

{#snippet action(label: string, svg: string, onclick: () => void, edge = false, kind = '')}
  <Tooltip text={label}>
    {#snippet trigger(tooltip)}
      <button type="button" class={[kind, { enabled: kind === 'notes' && notes }]} aria-label="{label}: {name}"
        aria-disabled={edge || busy} {...tooltip} onclick={() => { if (!edge && !busy) onclick(); }}><Icon
          {svg}
        /></button>
    {/snippet}
  </Tooltip>
{/snippet}

<style>
.list-edit {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: var(--gradient-list-edit);
  color: var(--color-card-text);
}

.icons {
  position: absolute;
  inset-inline: 0;
  inset-block-end: var(--list-edit-icons-bottom);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--list-reorder-gap);
}

button {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-list-reorder);
  line-height: 1;
  cursor: pointer;

  &[aria-disabled='true'] {
    cursor: default;
  }

  &:focus-visible {
    outline: var(--list-reorder-rank-border) solid var(--color-input-border-focus);
    outline-offset: var(--list-reorder-rank-border);
  }
}

.drag {
  cursor: grab;
  touch-action: none;
  font-size: var(--font-size-list-reorder-drag);
}

.notes {
  font-size: var(--font-size-list-edit-notes);
}

.enabled {
  color: var(--brand-primary);
}
</style>
