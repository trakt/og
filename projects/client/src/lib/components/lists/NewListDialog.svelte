<script lang="ts">
import Dialog from '$lib/components/dialog/Dialog.svelte';
import MultiSelect from '$lib/components/filters/MultiSelect.svelte';
import type { ListDraft } from '$lib/components/lists/ListDraft';
import { listItemSorts } from '$lib/lists/listItemSorts';
interface Props {
  open: boolean;
  busy?: boolean;
  error?: string;
  max?: number;
  avatar?: string;
  vip?: boolean;
  following: readonly { slug: string; name: string; avatar?: string }[];
  initial?: ListDraft;
  kind?: 'list' | 'watchlist' | 'favorites';
  editing?: boolean;
  title?: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
  followingError?: boolean;
  onsave: (draft: ListDraft) => void;
  onclose?: () => void;
}
let {
  open = $bindable(),
  busy = false,
  error = '',
  max,
  avatar,
  vip = false,
  following,
  followingError = false,
  onsave,
  onclose,
  initial,
  kind = 'list',
  editing = false,
  title,
  fieldErrors = {},
}: Props = $props();
// svelte-ignore state_referenced_locally
let draft = $state<ListDraft>(
  initial ? { ...initial, collaborators: [...initial.collaborators] } : {
    name: '',
    description: '',
    privacy: 'private',
    allow_comments: true,
    display_numbers: false,
    sort_by: 'rank',
    sort_how: 'asc',
    collaborators: [],
  },
);
const heading = $derived(title ?? (editing ? `Update your ${kind}` : 'Add a list'));
const visibleSorts = $derived(listItemSorts.filter((sort) => vip || !sort.vip));
const groups = $derived(
  ['main', 'site', 'votes', 'mine'].map((group) => ({
    group,
    sorts: visibleSorts.filter((sort) => sort.group === group),
  })),
);
const options = $derived([{
  options: following.map((user) => ({ value: user.slug, label: user.name, avatar: user.avatar })),
}]);
</script>
<!-- VIP destination is an external Trakt account page. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<Dialog bind:open title={heading} {avatar} {onclose}>
  {#snippet header(id)}<h2 {id} class="heading">{heading}</h2>{/snippet}
  <form onsubmit={(event) => { event.preventDefault(); if (!busy && max === undefined) onsave(draft); }} aria-busy={busy}>
    {#if max !== undefined}
      <p role="alert">You've already created <strong>{max}</strong> lists.
        {#if !vip}<a href="https://trakt.tv/vip/lists">Upgrade to VIP</a> to create unlimited lists.{/if}
      </p>
      {#if !vip}<a class="upgrade" href="https://trakt.tv/vip/lists">Upgrade Now ➟</a>{/if}
    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if kind === 'list'}
    <input {@attach (input) => { if (fieldErrors.name?.length) input.focus(); }} aria-invalid={Boolean(fieldErrors.name)} aria-label="Name" placeholder="Name" required maxlength="255" bind:value={draft.name} disabled={busy} />
    {#if fieldErrors.name}<p class="error" role="alert">{fieldErrors.name.join(' ')}</p>{/if}
    {/if}
    {#each Object.entries(fieldErrors).filter(([field]) => field !== 'name' && field !== 'collaborators') as [field, errors] (field)}<p class="error" role="alert">{field}: {errors.join(' ')}</p>{/each}
    <textarea aria-invalid={Boolean(fieldErrors.description)} aria-label="Description" placeholder="Description" rows="4" bind:value={draft.description} disabled={busy}></textarea>
    {#if kind === 'list'}
    <fieldset disabled={busy}><legend>Privacy {#if draft.privacy === 'link'}<span>Share link unavailable</span>{/if}</legend>
      <div class="choices">{#each [['private', 'Private'], ['link', 'Link'], ['friends', 'Following'], ['public', 'Public']] as choice (choice[0])}
        <label class:selected={draft.privacy === choice[0]}><input type="radio" name="privacy" value={choice[0]} bind:group={draft.privacy} />{choice[1]}</label>
      {/each}</div>
    </fieldset>
    <div class="collaborators"><h3>Collaborators</h3>
      <MultiSelect variant="list" bind:value={draft.collaborators} {options} label="Collaborators" placeholder="Choose users..." disabled={busy || followingError} />
    </div>
    {#if followingError}<p class="error" role="status">Couldn't load collaborators. Close and reopen to retry.</p>{/if}
    {#if fieldErrors.collaborators}<p class="error" role="alert">{fieldErrors.collaborators.join(' ')}</p>{/if}
    {/if}
    <div class="split">
      <fieldset disabled={busy}><legend>Allow Comments</legend><div class="choices">
        {#each [true, false] as value (value)}<label class:selected={draft.allow_comments === value}><input type="radio" name="comments" {value} bind:group={draft.allow_comments} />{value ? 'Yes' : 'No'}</label>{/each}
      </div></fieldset>
      <fieldset disabled={busy}><legend>Display Rank</legend><div class="choices">
        {#each [true, false] as value (value)}<label class:selected={draft.display_numbers === value}><input type="radio" name="rank" {value} bind:group={draft.display_numbers} />{value ? 'Yes' : 'No'}</label>{/each}
      </div></fieldset>
    </div>
    <label class="sorting">Default Sorting<div class="sort-fields">
      <select aria-label="Default Sorting" bind:value={draft.sort_by} disabled={busy}>{#each groups as group (group.group)}<optgroup label={{ main: 'Default Sorting', site: 'Site Ratings', votes: 'Votes', mine: 'Your data' }[group.group]}>{#each group.sorts as sort (sort.by)}<option value={sort.by}>{sort.label}</option>{/each}</optgroup>{/each}</select>
      <select aria-label="Sort direction" bind:value={draft.sort_how} disabled={busy}><option value="asc">↓</option><option value="desc">↑</option></select>
    </div></label>
    <button class="save" type="submit" disabled={busy || max !== undefined}>{busy ? 'Saving…' : 'Save List'}</button>
  </form>
</Dialog>
<style>
.heading {
  margin: var(--list-modal-heading-top) 0 var(--list-form-gap);
  text-align: center;
  font: italic var(--list-form-size) / var(--line-height-headings) var(--font-serif);
}
form {
  padding: 0 var(--space-dialog-wide-inline) var(--space-dialog-inline);
}
input:not([type='radio']),
textarea {
  display: block;
  inline-size: 100%;
  border-radius: 0;
  padding: var(--space-sm-inline);
  font-size: var(--list-form-size);
}
input:not([type='radio']) {
  block-size: auto;
  margin-block-end: calc(-1 * var(--list-border));
}
textarea {
  resize: vertical;
  min-block-size: var(--list-description-height);
}
fieldset {
  margin: var(--list-form-gap) 0 0;
  padding: 0;
  border: 0;
  min-inline-size: 0;
}
legend,
.collaborators h3,
.sorting {
  display: block;
  inline-size: 100%;
  margin: 0;
  padding: 0;
  color: var(--color-list-choice);
  font: var(--font-weight-headings) var(--list-row-size) / var(--line-height-headings) var(--font-headings);
  text-transform: uppercase;
}
legend span {
  float: right;
  font-size: var(--font-size-small);
  color: var(--brand-primary);
  text-transform: none;
}
.choices {
  display: flex;
  margin-block-start: var(--space-xs-inline);
}
.choices label {
  position: relative;
  flex: 1 1 auto;
  padding: var(--space-sm-block) var(--space-xs-inline);
  background: var(--color-input-bg);
  color: var(--color-text-muted);
  text-align: center;
  cursor: pointer;
  font-size: var(--font-size-base);
}
.choices label:first-child {
  border-start-start-radius: var(--radius-rating-popover);
  border-end-start-radius: var(--radius-rating-popover);
}
.choices label:last-child {
  border-start-end-radius: var(--radius-rating-popover);
  border-end-end-radius: var(--radius-rating-popover);
}
.choices label.selected {
  background: var(--color-list-choice);
  color: var(--color-text-inverse);
}
.choices label:has(:focus-visible) {
  outline: var(--list-border) solid var(--color-input-border-focus);
  outline-offset: var(--list-border);
}
.choices input {
  position: absolute;
  opacity: 0;
  inline-size: 100%;
  block-size: 100%;
  inset: 0;
  cursor: pointer;
}
.collaborators,
.sorting {
  margin-block-start: var(--list-form-gap);
}
.collaborators :global(.multi-select) {
  display: block;
  inline-size: 100%;
  min-block-size: var(--list-collaborators-height);
  margin-block-start: var(--space-xs-inline);
  text-transform: none;
}
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg-inline);
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
  min-block-size: var(--list-select-height);
  padding: 0 var(--space-sm-inline);
  border-radius: 0;
  font: var(--font-size-base) var(--font-body);
}
.sort-fields select:last-child {
  flex: 0 0 var(--list-sort-direction-width);
}
.save {
  inline-size: 100%;
  margin-block-start: var(--list-form-gap);
  padding: var(--space-lg-block) var(--space-lg-inline);
  border: var(--list-border) solid var(--brand-primary);
  border-radius: var(--list-submit-radius);
  background: var(--brand-primary);
  color: var(--color-text-inverse);
  font: var(--font-weight-headings-heavy) var(--font-size-dialog-submit) / var(--line-height-base) var(--font-headings);
  text-transform: uppercase;
}
.upgrade {
  display: block;
  text-align: center;
  margin-block-end: var(--list-form-gap);
}
input[aria-invalid="true"],
textarea[aria-invalid="true"] {
  border-color: var(--brand-danger);
}
.error {
  color: var(--brand-danger);
  font-size: var(--font-size-small);
}
</style>
