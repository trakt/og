<!-- OG's report modals: items from media summaries and the user options menu, and comments. -->
<script lang="ts">
import { page } from '$app/state';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import Dialog from '$lib/components/dialog/Dialog.svelte';
import { toast } from '$lib/components/toast/toast.svelte';
import type { ReportTarget } from '$lib/components/summary/ReportTarget';
import { reportReasons } from '$lib/components/summary/reportReasons';
import { validateReport } from '$lib/components/summary/validateReport';
import { writeMediaTool } from '$lib/components/summary/writeMediaTool';

interface Props {
  open: boolean;
  target: ReportTarget;
}
let { open = $bindable(), target }: Props = $props();
const id = $props.id();
const permalink = $derived(`${page.url.origin}${target.href}`);
let reason = $state('');
let message = $state('');
let error = $state('');
let invalid = $state({ reason: false, message: false });
let busy = $state(false);
let select = $state<HTMLSelectElement>();
let textarea = $state<HTMLTextAreaElement>();
const instructions = $derived(
  target.type === 'comment'
    ? ['spoilers', 'duplicate', 'other'].includes(reason)
    : (target.type !== 'user' || reason === 'other') &&
      ['metadata', 'duplicate', 'remove', 'data_refresh', 'runtime', 'tmdb', 'other', 'adult'].includes(reason),
);
const tmdb = $derived(target.tmdb ?? 'https://www.themoviedb.org');

$effect(() => {
  if (!open) return;
  reason = '';
  message = '';
  error = '';
  invalid = { reason: false, message: false };
});

// Keep the permalink in the tab order, but start a report at its reason control.
const focusReason = (control: HTMLSelectElement) => {
  if (open) {
    queueMicrotask(() => {
      if (open) control.focus();
    });
  }
};

async function submit(event: SubmitEvent) {
  event.preventDefault();
  if (busy) return;
  invalid = validateReport({ type: target.type, reason, message });
  if (invalid.reason || invalid.message) {
    // OG's comment modal only marks the fields.
    error = target.type === 'comment' ? '' : 'Please choose a reason and type in a message.';
    (invalid.reason ? select : textarea)?.focus();
    return;
  }
  busy = true;
  error = '';
  const result = await writeMediaTool({
    fetch: authenticatedFetch({ manager: userManager() }),
    action: { kind: 'report', target, reason, message },
  });
  busy = false;
  if (!result.ok) {
    error = result.message;
    // OG's comment modal only shows it inline.
    if (target.type !== 'comment') toast.error(result.message);
    return;
  }
  open = false;
  toast.success(result.message);
}
</script>

<!-- External/permalink links aren't typed SvelteKit routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<Dialog bind:open title="Report {target.type}" size="md" variant="report">
  {#snippet header(titleId)}
    <header class="report-title">
      <h2 id={titleId}>Report {target.type}</h2>
      {#if target.title}<p>{target.title}</p>{/if}
      <a href={permalink} target="_blank" rel="noopener">{permalink}</a>
    </header>
  {/snippet}
  <form onsubmit={submit} novalidate aria-busy={busy}>
    {#if error}<p id="{id}-error" class="error" role="alert">{error}</p>{/if}
    <label for="{id}-reason">Reason</label>
    <select {@attach focusReason} id="{id}-reason" bind:this={select} bind:value={reason} aria-invalid={invalid.reason} aria-describedby={error ? `${id}-error` : undefined} disabled={busy} onchange={() => { invalid.reason = false; textarea?.focus(); }}>
      <option value=""></option>
      {#each reportReasons(target.type) as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    {#if instructions}
      <h3>Instructions</h3>
      <p class="instructions">
        {#if reason === 'spoilers'}
          If you've already seen this item, spoilers won't be hidden.
        {:else if reason === 'duplicate' && target.type === 'comment'}
          Please include Trakt links for the original comment and all duplicates.
        {:else if reason === 'metadata'}
          Please update <a href={tmdb} target="_blank" rel="noopener">TMDB</a> before reporting this item. Trakt will automatically refresh about <b>24 hours</b> after <a href={tmdb} target="_blank" rel="noopener">TMDB</a> is updated.
        {:else if reason === 'duplicate'}
          Please report the duplicate item only <em>(not the correct item)</em> and include the Trakt link to the correct item.
        {:else if reason === 'remove'}
          Please check for duplicates first. Sometimes we actually need to merge duplicates and not simply remove the item. Please make sure the item has been removed from <a href={tmdb} target="_blank" rel="noopener">TMDB</a> before reporting it.
        {:else if reason === 'data_refresh'}
          Please update <a href={tmdb} target="_blank" rel="noopener">TMDB</a> before reporting this item. If the item hasn't been updated in 24 hours, we'll automatically queue it for a refresh.
        {:else if reason === 'runtime'}
          Please update <a href={tmdb} target="_blank" rel="noopener">TMDB</a> with the correct runtime before reporting this item. Trakt will auto refresh and grab the updated runtime.
        {:else if reason === 'tmdb'}
          Please make sure <a href={tmdb} target="_blank" rel="noopener">TMDB</a> is updated and the TMDB comparison page indicates we're ready to migrate.
        {:else if reason === 'adult'}
          Please make sure <a href={tmdb} target="_blank" rel="noopener">TMDB</a> has this item marked as <em>adult</em> before reporting it.
        {:else}
          If possible, please select a built in reason. If not, please be as detailed as you can.
        {/if}
      </p>
    {/if}
    <label for="{id}-message">Message</label>
    <textarea id="{id}-message" bind:this={textarea} bind:value={message} rows="2" disabled={busy} aria-invalid={invalid.message} aria-describedby={error ? `${id}-error` : undefined} oninput={() => { invalid.message = false; }}></textarea>
    <button type="submit" class="send" disabled={busy}>{busy ? 'Sending...' : 'Send'}</button>
  </form>
</Dialog>

<style>
.report-title {
  padding: var(--space-panel) var(--space-dialog-inline);
  border-block-end: 1px solid var(--color-dialog-title-border);
  background: var(--color-dialog-title-bg);
  overflow-wrap: anywhere;
  h2 {
    margin: 0;
    color: var(--color-dialog-title-text);
    font-size: var(--font-size-dialog-title);
    font-weight: var(--font-weight-headings);
    margin-block-end: var(--report-label-gap);
    text-transform: uppercase;
  }
  p {
    margin: 0 0 var(--report-title-gap);
    font-family: var(--font-headings);
    line-height: var(--line-height-headings);
  }
}
form {
  padding: 0 var(--space-dialog-inline) var(--space-dialog-inline);
}
label,
h3 {
  display: block;
  margin: var(--gutter) 0 var(--report-label-gap) var(--report-label-inline-offset);
  color: var(--color-report-label);
  font-family: var(--font-headings);
  font-size: var(--font-size-dialog-title);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-headings);
  text-transform: uppercase;
}
select,
textarea {
  inline-size: 100%;
  border-radius: var(--radius-base);
}
select {
  block-size: var(--report-select-height);
  min-block-size: 0;
  padding: 0 var(--report-control-padding);
}
textarea {
  display: block;
  padding: var(--report-control-padding);
  font-size: var(--font-size-dialog-submit);
  resize: vertical;
}
.instructions {
  margin: 0;
}
.error {
  margin: 0 calc(-1 * var(--space-dialog-inline));
  padding: var(--space-panel) var(--space-dialog-inline);
  background: var(--color-report-error-bg);
  color: var(--color-report-error);
}
[aria-invalid='true'] {
  border-color: var(--color-report-error);
  background: var(--color-report-invalid-bg);
}
.send {
  display: block;
  border-radius: var(--radius-base);
  margin-block-start: var(--gutter);
  padding: var(--space-lg-block) var(--space-lg-inline);
  border-color: var(--color-btn-primary-border);
  background: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-dialog-submit);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
  &:is(:hover, :focus-visible) {
    background: var(--brand-primary-darken);
  }
}
</style>
