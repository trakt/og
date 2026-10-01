<script lang="ts">
import Dialog from '$lib/components/dialog/Dialog.svelte';
import { listItemSorts } from '$lib/lists/listItemSorts';
interface Props {
  open: boolean;
  kind: 'watchlist' | 'favorites';
  avatar?: string;
  vip: boolean;
  busy: boolean;
  description: string | undefined;
  sortBy: string;
  sortHow: string;
  onsave: (draft: { description?: string; sort_by: string; sort_how: string }) => void;
}
let { open = $bindable(), kind, avatar, vip, busy, description, sortBy, sortHow, onsave }: Props = $props();
let text = $state('');
let touched = $state(false);
let by = $state('rank');
let how = $state('asc');
$effect(() => {
  if (open) {
    text = description ?? '';
    touched = false;
    by = sortBy;
    how = sortHow;
  }
});
const sorts = $derived(listItemSorts.filter((sort) => vip || !sort.vip));
</script>
<Dialog bind:open title="Update your {kind}" {avatar}>
  {#snippet header(id)}<h2 {id} class="heading">Update your {kind}</h2>{/snippet}
  <form onsubmit={(event) => { event.preventDefault(); if (!busy) onsave({ ...(touched && { description: text }), sort_by: by, sort_how: how }); }} aria-busy={busy}>
    <textarea aria-label="Description" placeholder="Description" rows="4" bind:value={text} oninput={() => touched = true} disabled={busy}></textarea>
    {#if description === undefined}<p class="hint">Existing description is unavailable. Leave this field untouched to keep it.</p>{/if}
    <label class="sorting">Default Sorting<div class="sort-fields">
      <select aria-label="Default Sorting" bind:value={by} disabled={busy}>{#each sorts as sort (sort.by)}<option value={sort.by}>{sort.label}</option>{/each}</select>
      <select aria-label="Sort direction" bind:value={how} disabled={busy}><option value="asc">↓</option><option value="desc">↑</option></select>
    </div></label>
    <button class="save" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save List'}</button>
  </form>
</Dialog>
<style>
.heading {
  margin: var(--list-modal-heading-top) 0 var(--list-form-gap);
  text-align: center;
  font: italic var(--list-form-size) / var(--line-height-base) var(--font-serif);
}
form {
  padding: 0 var(--space-dialog-wide-inline) var(--space-dialog-inline);
}
textarea {
  display: block;
  inline-size: 100%;
  border-radius: 0;
  padding: var(--space-sm-inline);
  font-size: var(--list-form-size);
}
.sorting {
  display: block;
  inline-size: 100%;
  margin: 0;
  padding: 0;
  color: var(--color-list-choice);
  font: var(--font-weight-headings) var(--list-row-size) / var(--line-height-base) var(--font-headings);
  text-transform: uppercase;
}
.sort-fields {
  display: flex;
  gap: var(--space-panel);
  margin-block-start: var(--space-xs-inline);
}
.sort-fields select {
  flex: 1;
  min-inline-size: 0;
  block-size: var(--list-select-height);
  padding-block: 0;
}
.sort-fields select:last-child {
  flex: 0 0 var(--list-sort-direction-width);
}
.save {
  inline-size: 100%;
  margin-block-start: var(--space-dialog-inline);
  padding: var(--space-lg-block) var(--space-lg-inline);
  border: 0;
  border-radius: var(--list-submit-radius);
  background: var(--brand-primary);
  color: var(--color-text-inverse);
  font: var(--font-weight-headings-heavy) var(--font-size-dialog-submit) / var(--line-height-base) var(--font-headings);
  text-transform: uppercase;
}

.sorting {
  display: block;
  margin-block-start: var(--list-form-gap);
  color: var(--color-list-choice);
  font: var(--font-weight-headings) var(--list-row-size) / var(--line-height-base) var(--font-headings);
  text-transform: uppercase;
}
.hint {
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}
</style>
