<script lang="ts">
import RankInput from '$lib/components/lists/RankInput.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import drag from '$lib/icons/solid/arrows-up-down-left-right.svg?raw';
import first from '$lib/icons/solid/angles-up.svg?raw';
import up from '$lib/icons/solid/angle-up.svg?raw';
import down from '$lib/icons/solid/angle-down.svg?raw';
import last from '$lib/icons/solid/angles-down.svg?raw';
interface Props {
  name: string;
  rank: number;
  total: number;
  busy?: boolean;
  onmove: (rank: number) => void;
  ondrag: (event: PointerEvent) => void;
}
const { name, rank, total, busy = false, onmove, ondrag }: Props = $props();
</script>
<RankInput {name} {rank} {busy} {onmove} />
<div class="controls">
  <div class="icons">
    <Tooltip text="Drag to reorder">
      {#snippet trigger(tooltip)}
        <button type="button" class="drag" aria-label="Drag to reorder {name}" aria-keyshortcuts="ArrowUp ArrowDown" aria-disabled={busy}
          {...tooltip} onpointerdown={ondrag} onkeydown={(event) => {
            if (busy || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault(); onmove(rank + (event.key === 'ArrowUp' ? -1 : 1));
          }}><Icon svg={drag} /></button>
      {/snippet}
    </Tooltip>
    {@render action('Move first', first, 1, rank === 1)}
    {@render action('Move up', up, rank - 1, rank === 1)}
    {@render action('Move down', down, rank + 1, rank === total)}
    {@render action('Move last', last, total, rank === total)}
  </div>
</div>
{#snippet action(label: string, svg: string, to: number, edge: boolean)}
  <Tooltip text={label}>
    {#snippet trigger(tooltip)}
      <button type="button" aria-label="{label}: {name}" aria-disabled={edge || busy} {...tooltip}
        onclick={() => { if (!edge && !busy) onmove(to); }}><Icon {svg} /></button>
    {/snippet}
  </Tooltip>
{/snippet}
<style>
.controls {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--color-list-reorder-overlay);
  color: var(--color-card-text);
}
.icons {
  display: flex;
  align-items: center;
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
}
.drag {
  cursor: grab;
  touch-action: none;
  font-size: var(--font-size-list-reorder-drag);
}
button:focus-visible {
  outline: var(--list-reorder-rank-border) solid var(--color-input-border-focus);
  outline-offset: var(--list-reorder-rank-border);
}
</style>
