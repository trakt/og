<!--
  The band Manage opens under a list's title row: "N items selected" (the filtered count) and the whole-selection actions.
  Reset Ranks and Delete ask first; Copy and Move are 's.
-->
<script lang="ts">
import { prefersReducedMotion } from 'svelte/motion';
import { slide } from 'svelte/transition';
import ManageConfirm from '$lib/components/comments/ManageConfirm.svelte';
import Container from '$lib/components/container/Container.svelte';
import type { Snippet } from 'svelte';
import resetIcon from '$lib/icons/thin/arrow-down-arrow-up.svg?raw';
import trashXmark from '$lib/icons/thin/trash-xmark.svg?raw';

interface Props {
  count: number;
  busy: boolean;
  onreset: () => void;
  ondelete: () => void;
  transfers?: Snippet;
}

const { count, busy, onreset, ondelete, transfers }: Props = $props();
const items = $derived(`item${count === 1 ? '' : 's'}`);
</script>

<section class="manage" aria-label="Manage items" aria-busy={busy}
  transition:slide={{ duration: prefersReducedMotion.current ? 0 : 500 }}>
  <Container>
    <div class="bar">
      <p class="count"><b>{count.toLocaleString('en-US')}</b> {items} selected</p>
      <div class="actions">
        <ManageConfirm name="reset" svg={resetIcon} label="Set current order as your ranks" text="Reset Ranks" yes="Yes"
          {busy} onconfirm={onreset}>
          Reset ranks on <b>{count.toLocaleString('en-US')}</b> {items}?
        </ManageConfirm>
        {@render transfers?.()}
        <ManageConfirm name="delete" svg={trashXmark} label="Delete items" text="Delete" yes="Yes, delete them!"
          warning="This can't be undone!" {busy} onconfirm={ondelete}>
          Delete <b>{count.toLocaleString('en-US')}</b> {items} from this list?
        </ManageConfirm>
      </div>
    </div>
  </Container>
</section>

<style>
.manage {
  overflow: clip;
  background-color: var(--brand-fifth);
  color: var(--color-text-inverse);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--gutter);
  padding: var(--list-manage-padding);
}

.count {
  margin: 0;
  padding-block-start: var(--list-manage-count-offset);
  font-family: var(--font-headings);
  font-size: var(--font-size-list-manage);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-headings);

  & b {
    font-weight: var(--font-weight-headings-heavy);
  }
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--list-row-action-gap);
  min-block-size: var(--list-manage-row-height);
}

.actions :global(.confirm > button) {
  display: inline-flex;
  align-items: center;
  gap: var(--list-manage-icon-gap);
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-list-row-action);
  line-height: 1;
  cursor: pointer;

  &:focus-visible {
    outline: var(--list-reorder-rank-border) solid var(--color-text-inverse);
    outline-offset: var(--list-reorder-rank-border);
  }
}

.actions :global(.confirm .text) {
  font-family: var(--font-headings);
  font-size: var(--font-size-list-row-meta);
  font-weight: var(--font-weight-headings-light);
  text-transform: uppercase;
}

/* OG kept only the icons on phones. */
@media (width < 768px) {
  .actions :global(.confirm .text) {
    display: none;
  }
}
</style>
