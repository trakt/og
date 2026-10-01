<script lang="ts">
import ManageConfirm from '$lib/components/comments/ManageConfirm.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import pencil from '$lib/icons/trakt/pencil.svg?raw';
import deleteIcon from '$lib/icons/trakt/delete.svg?raw';

const { onedit, ondelete, busy = false }: {
  onedit: () => void;
  ondelete: () => void;
  busy?: boolean;
} = $props();
</script>

<div class="note-manage">
  <Tooltip text="Edit">
    {#snippet trigger(tooltip)}
      <button type="button" class="edit" aria-label="Edit" aria-disabled={busy || undefined}
        onclick={() => { if (!busy) onedit(); }} {...tooltip}><Icon svg={pencil} /></button>
    {/snippet}
  </Tooltip>
  <ManageConfirm name="delete" svg={deleteIcon} label="Delete" yes="Yes, delete it!" {busy} onconfirm={ondelete}>
    Delete your note?
  </ManageConfirm>
</div>

<style>
.note-manage {
  display: flex;
  align-items: center;
  gap: var(--note-manage-gap);
  margin-inline-start: auto;
  margin-block-start: var(--note-manage-top);
  color: var(--color-comment-delete);
  --confirm-icon-size: var(--font-size-comment-icon);
}
.edit {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-comment-edit);
  font-size: var(--font-size-comment-icon);
  line-height: 1;
}
</style>
