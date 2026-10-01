<!--
  The "Private Notes" box under a summary's overview : the viewer's note with when it
  was updated, which opens the notes modal to edit it, or an "Add Private Notes" tile. Logged out, the tile signs in
  and comes back. Saving is optimistic: the box shows the new text at once and puts the old one back if the API fails.
-->
<script lang="ts">
import { page } from '$app/state';
import { tick } from 'svelte';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import NotesDialog from '$lib/components/notes/NotesDialog.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import memoPlus from '$lib/icons/kit/solid-memo-circle-plus.svg?raw';
import type { NotableItem } from '$lib/notes/NotableItem';
import type { PrivateNote } from '$lib/notes/PrivateNote';
import { saveNote } from '$lib/notes/saveNote';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import { formatDate } from '$lib/utils/formatDate';
import SummaryTile from './SummaryTile.svelte';

interface Props {
  item: NotableItem;
  note: PrivateNote | null;
  signedIn: boolean;
  datePreferences: DatePreferences;
}

const { item, note: loaded, signedIn, datePreferences }: Props = $props();

// Follows the loader on navigation; a save overrides it until the next load.
let note = $derived(loaded);
const id = $props.id();
let open = $state(false);
let draft = $state('');
let saving = $state(false);
let section = $state<HTMLElement>();

const signIn = $derived(`/auth/signin?${new URLSearchParams({ redirect_to: page.url.pathname })}`);

function edit() {
  if (saving) return;
  draft = note?.text ?? '';
  open = true;
}

// Swapping the tile for the note (or back) removes the button the closing dialog hands focus back to, which
// leaves focus in the hidden dialog until the browser drops it on <body>.
async function refocus() {
  await tick();
  const focused = document.activeElement;
  if (!focused || focused === document.body || !focused.checkVisibility()) section?.querySelector('button')?.focus();
}

async function save(text: string) {
  open = false;
  const previous = note;
  const trimmed = text.trim();
  if (trimmed === (previous?.text ?? '')) return;

  note = trimmed ? { id: previous?.id ?? 0, text: trimmed, updatedAt: new Date().toISOString() } : null;
  saving = true;
  void refocus();
  const result = await saveNote({
    fetch: authenticatedFetch({ manager: userManager() }),
    item,
    note: previous,
    text: trimmed,
  });
  saving = false;
  if (!result.ok) {
    note = previous;
    void refocus();
    toast.error(result.message);
    return;
  }
  note = result.note;
  toast.success('Notes saved!');
}
</script>

<section class="private-notes" bind:this={section} aria-labelledby="{id}-title">
  <h2 id="{id}-title" class="title">
    Private Notes
    {#if note?.updatedAt}
      <span class="updated-at">&mdash; updated {formatDate(note.updatedAt, { ...datePreferences, format: 'll' })}</span>
    {/if}
  </h2>
  {#if note}
    <Tooltip text="Click to edit notes" placement="right">
      {#snippet trigger(tooltip)}
        <button type="button" class="notes" aria-busy={saving} onclick={edit} {...tooltip}>{note?.text}</button>
      {/snippet}
    </Tooltip>
  {:else if signedIn}
    <SummaryTile icon={memoPlus} price="Add" site="Private Notes" aria-busy={saving} onclick={edit} />
  {:else}
    <SummaryTile icon={memoPlus} price="Add" site="Private Notes" href={signIn} />
  {/if}
</section>

{#if signedIn}
  <NotesDialog bind:open bind:draft {item} onsave={save} />
{/if}

<style>
.private-notes {
  margin-block-end: 10px;
  --summary-tile-icon-size: var(--font-size-notes-icon);
  --summary-tile-icon-top: 3px;
}

.title {
  margin: 0 0 2px;
  color: var(--color-summary-label);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-base);
  text-transform: uppercase;
}

.updated-at {
  color: var(--color-note-updated);
  font-size: var(--font-size-small);
  font-style: italic;
  font-weight: var(--font-weight-headings-light);
  white-space: nowrap;
  text-transform: none;
}

.notes {
  display: block;
  inline-size: 100%;
  min-block-size: 0;
  margin-block-end: var(--notes-summary-bottom);
  padding: var(--notes-summary-padding);
  border: 1px solid var(--color-summary-tile-bg);
  border-radius: var(--radius-code);
  background-color: var(--color-summary-tile-bg);
  color: var(--color-summary-tile-text);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  text-align: start;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
