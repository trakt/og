<!--
  OG's notes modal  for an item's own note: "Add notes to" and the title over the item's
  fanart with its type pill, a 500-character textarea with the characters left in its corner, and Save.
  Cmd/Ctrl+Enter saves too. OG's privacy and spoiler toggles only showed for history, library and rating notes,
  which this doesn't take yet. Saving blank text deletes the note. A list item's notes
  leave out the pill and can name the show in the eyebrow; `children` sits above the textarea, like its notes limit.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import Dialog from '$lib/components/dialog/Dialog.svelte';
import FanartTitle from '$lib/components/dialog/FanartTitle.svelte';
import type { NotableItem } from '$lib/notes/NotableItem';

interface Props {
  open: boolean;
  draft: string;
  /** Left without a type, there's no type pill. */
  item: Pick<NotableItem, 'title' | 'year' | 'fanart'> & { readonly type?: NotableItem['type'] };
  onsave: (text: string) => void;
  /** Favorite notes use the same panel, without the private-note type pill. */
  favorite?: boolean;
  busy?: boolean;
  /** In place of "Add notes to". */
  eyebrow?: string;
  /** Save is off, as over the account's notes limit. */
  disabled?: boolean;
  children?: Snippet;
}

let {
  open = $bindable(),
  draft = $bindable(),
  item,
  onsave,
  favorite = false,
  busy = false,
  eyebrow = favorite ? 'You favorited...' : 'Add notes to',
  disabled = false,
  children,
}: Props = $props();

// OG's TRAKT_NOTES_MAX_LENGTH.
const MAX_LENGTH = 500;
const remaining = $derived(MAX_LENGTH - draft.length);

function submit(event: SubmitEvent) {
  event.preventDefault();
  if (!busy && !disabled) onsave(draft);
}

function saveShortcut(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

// Reads `open`, so each opening puts the caret after the existing note, like OG.
const caretToEnd = (textarea: HTMLTextAreaElement) => {
  if (open) textarea.setSelectionRange(textarea.value.length, textarea.value.length);
};
</script>

<Dialog bind:open title="Add notes to {item.title}" size="notes">
  {#snippet header(id)}
    <FanartTitle {id} {eyebrow} title={item.title} year={item.year} fanart={item.fanart}>
      {#if !favorite && item.type}<span class="pill">{item.type}</span>{/if}
    </FanartTitle>
  {/snippet}

  <form class="notes-form" onsubmit={submit}>
    {@render children?.()}
    <div class="notes-wrapper">
      <textarea
        bind:value={draft}
        aria-label="Notes"
        placeholder={favorite ? 'Why is this one of your all time favorites?' : 'Add notes...'}
        rows="5"
        maxlength={MAX_LENGTH}
        onkeydown={saveShortcut}
        {@attach caretToEnd}
      ></textarea>
      <span class="characters-remaining" aria-live="polite">{remaining}</span>
    </div>
    <button type="submit" class="save" disabled={busy || disabled} aria-busy={busy}>{busy ? 'Saving...' : 'Save'}</button>
  </form>
</Dialog>

<style>
.pill {
  display: inline-block;
  margin-block: 3px 5px;
  padding: var(--note-pill-padding);
  border-radius: var(--radius-note);
  background: var(--color-note-media);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-note-pill);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-note-pill);
  text-transform: uppercase;
}

.notes-form {
  padding: 0 var(--space-dialog-wide-inline) var(--space-dialog-inline);

  /* Lines up with the title band, which narrows its padding here too. */
  @media (width < 768px) {
    padding-inline: var(--space-panel);
  }
}

.notes-wrapper {
  position: relative;
}

textarea {
  display: block;
  inline-size: 100%;
  min-block-size: var(--notes-textarea-height);
  padding: var(--notes-textarea-padding);
  resize: vertical;
}

.characters-remaining {
  position: absolute;
  inset-block-end: 3px;
  inset-inline-end: 6px;
  color: var(--brand-success);
  font-family: var(--font-headings);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-headings);
}

.save {
  inline-size: 100%;
  margin-block-start: var(--gutter);
  padding: var(--space-lg-block) var(--space-lg-inline);
  border-color: var(--color-btn-primary-border);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-dialog-submit);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>
