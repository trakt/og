<script lang="ts">
import { type Snippet, tick } from 'svelte';
import Icon from '$lib/icons/Icon.svelte';
import plus from '$lib/icons/light/circle-plus.svg?raw';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import disc from '$lib/icons/light/compact-disc.svg?raw';
import close from '$lib/icons/trakt/delete-thick.svg?raw';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Spinner from '$lib/components/loading/Spinner.svelte';
import type { DatePreferences } from '$lib/settings/DatePreferences';
import { watchDateInput } from '$lib/components/history/watchDateInput';
import { watchDateInstant } from '$lib/components/history/watchDateInstant';
import { formatDate } from '$lib/utils/formatDate';

type Mode = 'date' | 'remove' | 'partial';
interface Props {
  label: string;
  variant?: 'summary' | 'card';
  fill?: number;
  selected?: boolean;
  busy?: boolean;
  plural?: boolean;
  small?: boolean;
  datePreferences: DatePreferences;
  trigger: Snippet;
  details?: Snippet;
  extraActions?: Snippet;
  onopen: (force: boolean) => Promise<Mode | null>;
  onwatch: (at: string | null, force: boolean) => void;
  onremaining: () => Promise<boolean>;
  oninvalid: () => void;
  /** Cards only: a "Watching now" choice that opens the check-in modal. */
  oncheckin?: () => void;
  onremovePlay?: () => void;
  tooltip?: string;
  collection?: boolean;
  hasMetadata?: boolean;
  metadata?: Snippet<[() => void, boolean]>;
}
const {
  label,
  variant = 'card',
  fill = 0,
  selected = fill > 0,
  busy = false,
  plural = false,
  small = false,
  datePreferences,
  trigger: content,
  details,
  extraActions,
  onopen,
  onwatch,
  onremaining,
  oninvalid,
  oncheckin,
  onremovePlay,
  tooltip,
  collection = false,
  hasMetadata = false,
  metadata,
}: Props = $props();
const id = $props.id();
let button = $state<HTMLButtonElement>();
let side = $state<HTMLButtonElement>();
let popover = $state<HTMLDivElement>();
let field = $state<HTMLInputElement>();
let expanded = $state(false);
let mode = $state<Mode>('date');
let editingMetadata = $state(false);
let savingMetadata = $state(false);
let force = $state(false);
let other = $state(false);
let value = $state('');
let maximum = $state('');
let returnTo = $state<HTMLButtonElement>();
let press: ReturnType<typeof setTimeout> | undefined;
let pressed = false;
const title = $derived(
  editingMetadata
    ? 'Any optional metadata?'
    : mode === 'date'
    ? collection ? 'When did you add this to library?' : 'When did you watch this?'
    : mode === 'remove'
    ? collection ? 'Remove from library?' : 'Remove from history?'
    : 'What would you like to do?',
);
const instant = $derived(value ? watchDateInstant(value, datePreferences.timeZone) : null);

async function open(add: boolean) {
  if (busy) return;
  const next = await onopen(add);
  if (!next) return;
  mode = next;
  force = add;
  other = false;
  editingMetadata = false;
  savingMetadata = false;
  returnTo = add && side ? side : button;
  popover?.showPopover();
}
function toggle(event: ToggleEvent) {
  expanded = event.newState === 'open';
  if (expanded) popover?.querySelector<HTMLElement>('button, select')?.focus();
  else returnTo?.focus({ preventScroll: true });
}
function choose(at: string | null) {
  if (busy) return;
  popover?.hidePopover();
  onwatch(at, force);
}
function otherDate() {
  const now = new Date();
  maximum = watchDateInput(now, datePreferences.timeZone);
  value = watchDateInput(new Date(Math.floor(now.getTime() / 900_000) * 900_000), datePreferences.timeZone);
  other = true;
}
$effect(() => {
  if (other) field?.focus();
  if (editingMetadata) popover?.querySelector<HTMLSelectElement>('select')?.focus();
});
function submit(event: SubmitEvent) {
  event.preventDefault();
  if (!instant || value > maximum || !field?.validity.valid) {
    oninvalid();
    return;
  }
  choose(instant);
}
async function remaining() {
  if (await onremaining()) {
    popover?.hidePopover();
    return;
  }
  mode = 'date';
  force = false;
  popover?.querySelector<HTMLButtonElement>('.choices button')?.focus();
}
function editMetadata(save: boolean) {
  savingMetadata = save;
  editingMetadata = true;
}
async function finishMetadata() {
  editingMetadata = false;
  if (savingMetadata) popover?.hidePopover();
  else {
    await tick();
    popover?.querySelector<HTMLButtonElement>('.choices button')?.focus();
  }
}
function release() {
  clearTimeout(press);
}
function pointerdown(event: PointerEvent) {
  if (event.button !== 0) return;
  pressed = false;
  press = setTimeout(() => {
    pressed = true;
    void open(true);
  }, 500);
}
function click() {
  release();
  if (pressed) {
    pressed = false;
    return;
  }
  void open(false);
}
</script>

<div class={['watch-control', variant, { small, collection, selected }]} style:--watch-fill={fill}
  style:--watch-color={collection ? 'var(--brand-quaternary)' : 'var(--brand-tertiary)'}
  style:anchor-name="--watch-{id}" aria-busy={busy}>
  <Tooltip text={tooltip} placement="bottom">
    {#snippet trigger(tip)}
      <button bind:this={button} type="button" class="watch-trigger" aria-label={label}
        aria-controls="watch-{id}" aria-haspopup="dialog" aria-expanded={expanded} aria-disabled={busy}
        onclick={click} onpointerdown={pointerdown} onpointerup={release} onpointercancel={release} onpointerleave={release} {...tip}>
        <span class="base"></span>{@render content()}
      </button>
    {/snippet}
  </Tooltip>
  {#if variant === 'summary'}
    <div class={['side-actions', { multiple: extraActions }]}>
    <Tooltip text={collection ? 'Add to library' : `Add additional ${plural ? 'plays' : 'play'}`} placement="right">
      {#snippet trigger(tip)}
        <button bind:this={side} type="button" class="side" aria-label="{collection ? 'Add to library' : `Add additional ${plural ? 'plays' : 'play'}`}"
          aria-controls="watch-{id}" aria-haspopup="dialog" aria-expanded={expanded} aria-disabled={busy} onclick={() => open(true)} {...tip}><Icon svg={plus} /></button>
      {/snippet}
    </Tooltip>
    {@render extraActions?.()}
    </div>
    {#if details}<div class="details">{@render details()}</div>{/if}
  {/if}
  {#if busy}<span class="busy"><Spinner label={collection ? "Saving collection" : "Saving watched history"} /></span>{/if}
</div>
<div bind:this={popover} id="watch-{id}" class={['watch-popover', { other, collection, editingMetadata }]}
  popover="auto" role="dialog" aria-label={title} style:position-anchor="--watch-{id}" ontoggle={toggle}>
  <h3>{title}</h3>
  {#if mode === 'date' || editingMetadata}
    <button type="button" class="close" aria-label={collection ? "Close library popover" : "Close watch popover"} onclick={() => popover?.hidePopover()}><Icon svg={close} /></button>
  {/if}
  {#if editingMetadata && metadata}
    {@render metadata(finishMetadata, savingMetadata)}
  {:else}
  <div class={['choices', { dates: mode === 'date' }]}>
    {#if mode === 'date'}
      {#if other}
        <form onsubmit={submit} novalidate>
          <label for="watch-date-{id}">{collection ? 'Collected' : 'Watched'} date and time</label>
          <input bind:this={field} bind:value id="watch-date-{id}" type="datetime-local" required max={maximum} step="900" />
          <p>{instant ? formatDate(instant, { ...datePreferences, format: 'LL', time: true }) : 'Choose a valid date and time.'}</p>
          <button type="submit" aria-label={collection ? "Save collected date" : "Save watched date"}><Icon svg={check} /></button>
          <button type="button" class="cancel" aria-label="Cancel other date" onclick={() => { other = false; popover?.querySelector<HTMLButtonElement>('.close')?.focus(); }}><Icon svg={close} /></button>
        </form>
      {:else}
        {#if oncheckin && !collection}
          <button type="button" class="checkin" aria-haspopup="dialog" onclick={() => { popover?.hidePopover(); oncheckin(); }}>Watching now</button>
        {/if}
        <button type="button" onclick={() => choose('now')}>{collection ? 'Right now' : 'Just finished'}</button>
        <button type="button" onclick={() => choose('released')}>Release date</button>
        <button type="button" onclick={() => choose('unknown')}>Unknown date</button>
        <button type="button" onclick={otherDate}>Other date</button>
      {/if}
    {:else if mode === 'remove'}
      {#if onremovePlay}<button type="button" onclick={() => { popover?.hidePopover(); onremovePlay(); }}>Only this play</button>{/if}
      <button type="button" onclick={() => choose(null)}>{collection ? plural ? 'All episodes' : 'Yes' : plural ? 'All episode plays' : 'All plays'}</button>
      <button type="button" class="cancel" onclick={() => popover?.hidePopover()}>No</button>
      {#if collection}
      <button type="button" class="add" aria-label="Change metadata" onclick={() => editMetadata(true)}><Icon svg={disc} /><span class="metadata-caret" aria-hidden="true"></span></button>
      {:else}<button type="button" class="add" aria-label="{collection ? 'Add to library' : `Add additional ${plural ? 'plays' : 'play'}`}" onclick={() => { mode = 'date'; force = true; }}><Icon svg={plus} /></button>{/if}
    {:else}
      <button type="button" onclick={remaining}>{collection ? 'Add remaining' : 'Watch remaining'}</button>
      <button type="button" onclick={() => choose(null)}>Remove all</button>
      <button type="button" class="cancel" onclick={() => popover?.hidePopover()}>Nothing</button>
    {/if}
    {#if collection && metadata && mode === 'date' && !other}<button type="button" class="add metadata-toggle" class:selected={hasMetadata} aria-label="Add metadata" onclick={() => editMetadata(false)}><Icon svg={disc} /></button>{/if}
  </div>
  {/if}
</div>

<style>
.watch-control {
  position: relative;
  color: var(--watch-color, var(--brand-tertiary));
  &.summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    border: var(--watch-border) solid var(--watch-color, var(--brand-tertiary));
    background: var(--color-action-bg);
    &.selected {
      background: var(--watch-color, var(--brand-tertiary));
      color: var(--color-text-inverse);
    }
  }
  &.card {
    inline-size: var(--watch-card-width);
    block-size: var(--watch-card-height);
    &.small {
      inline-size: var(--watch-card-small-width);
      block-size: var(--watch-card-small-height);
    }
  }
  &[aria-busy='true'] {
    opacity: var(--watch-busy-opacity);
    cursor: wait;
  }
}
.busy {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--color-box);
  color: var(--watch-color, var(--brand-tertiary));
  font-size: var(--font-size-action-icon);
}
.watch-trigger,
.side {
  position: relative;
  display: flex;
  align-items: center;
  inline-size: 100%;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  &:focus-visible {
    outline: var(--watch-focus) solid var(--color-input-border-focus);
    outline-offset: calc(-1 * var(--watch-focus));
  }
}
.summary .watch-trigger {
  min-block-size: var(--action-height);
  &:is(:hover, :focus-visible) {
    background: var(--watch-color, var(--brand-tertiary));
    color: var(--color-text-inverse);
  }
}
.side {
  padding-inline: var(--watch-side-start) var(--watch-side-end);
  background: var(--color-action-side-bg);
  color: var(--color-action-side);
  font-size: var(--font-size-large);
  .selected & {
    background: var(--color-action-side-bg-hover);
    color: var(--color-text-inverse);
  }
  &:is(:hover, :focus-visible) {
    background: var(--watch-color, var(--brand-tertiary));
    color: var(--color-text-inverse);
  }
}
.side-actions {
  grid-column: 2;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--color-action-side-bg);
  color: var(--color-action-side);
  .selected & {
    background: var(--color-action-side-bg-hover);
    color: var(--color-text-inverse);
  }
  &.multiple {
    padding-block: var(--visibility-side-top) var(--visibility-side-bottom);
  }
  &.multiple .side {
    block-size: var(--visibility-side-height);
    font-size: var(--visibility-side-size);
  }
}
.details {
  grid-column: 1;
  padding: 0 var(--watch-detail-inline) var(--watch-detail-bottom) var(--action-icon-width);
  font-size: var(--watch-history-size);
  line-height: var(--watch-detail-line);
  &:empty {
    display: none;
  }
}
.base {
  display: none;
}
.card .watch-trigger {
  display: grid;
  place-items: center;
  block-size: 100%;
  font-size: var(--font-size-quick-icon);
  .small & {
    font-size: var(--font-size-quick-icon-small);
  }
  .base {
    display: block;
    position: absolute;
    inset: 0;
    background: var(--watch-color, var(--brand-tertiary));
    opacity: var(--watch-fill);
    transition: opacity var(--transition-card);
  }
  & :global(.icon) {
    position: relative;
  }
  .selected &,
  &:is(:hover, :focus-visible) {
    color: var(--color-card-text);
  }
  &:is(:hover, :focus-visible) .base {
    opacity: 1;
  }
}
.watch-popover {
  position: fixed;
  position-area: bottom;
  position-try-fallbacks: flip-block, flip-inline;
  inset: auto;
  inline-size: max-content;
  max-inline-size: calc(100vw - var(--gutter));
  margin: var(--watch-popover-gap) 0;
  padding: 0;
  overflow: visible;
  border: var(--watch-border) solid var(--color-dropdown-border);
  border-radius: var(--radius-rating-popover);
  background: var(--color-box);
  color: var(--color-text);
  box-shadow: var(--shadow-dropdown);
  font: var(--font-size-base) / var(--line-height-base) var(--font-body);
  text-align: center;
  &::before {
    content: '';
    position: absolute;
    inset-block-end: 100%;
    inset-inline-start: calc(50% - var(--watch-arrow));
    border: var(--watch-arrow) solid transparent;
    border-block-end-color: var(--color-watch-prompt);
  }
}
.collection:has(.dates),
.editingMetadata {
  inline-size: var(--collection-metadata-width);
}
.metadata-toggle {
  grid-column: 1 / -1;
  justify-self: center;
  &.selected {
    color: var(--brand-primary);
  }
}
h3 {
  margin: 0;
  padding: var(--watch-prompt-block) var(--watch-prompt-inline);
  border-block-end: var(--watch-border) solid var(--color-menu-divider);
  background: var(--color-watch-prompt);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--watch-prompt-line);
  .watch-popover:has(.close) & {
    padding-inline-end: var(--watch-prompt-close-space);
  }
}
.choices {
  display: flex;
  align-items: center;
  gap: var(--watch-choice-gap);
  padding: var(--watch-body-block) var(--watch-body-inline);
  &.dates {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  & button {
    min-block-size: 0;
    padding: var(--watch-choice-block) var(--watch-choice-inline);
    border: var(--watch-border) solid transparent;
    border-radius: var(--watch-choice-radius);
    background: var(--brand-primary);
    color: var(--color-text-inverse);
    font: var(--font-weight-headings) var(--font-size-small) / var(--line-height-base) var(--font-headings);
    cursor: pointer;
    &:is(:hover, :focus-visible) {
      background: var(--brand-primary-darken);
    }
    &.cancel {
      background: var(--color-watch-cancel);
      &:is(:hover, :focus-visible) {
        background: var(--gray-light);
      }
    }
    &.checkin {
      grid-column: 1 / -1;
    }
    &.add {
      padding: 0;
      border: 0;
      line-height: var(--watch-add-line);
      background: none;
      color: var(--gray-light);
      font-size: var(--font-size-large);
    }
  }
}
.metadata-caret {
  display: inline-block;
  vertical-align: middle;
  margin-inline-start: var(--watch-metadata-caret-gap);
  border-block-start: var(--watch-metadata-caret-size) solid currentColor;
  border-inline: var(--watch-metadata-caret-size) solid transparent;
}
.close {
  position: absolute;
  inset-block-start: var(--watch-close-top);
  inset-inline-end: var(--watch-close-right);
  padding: 0;
  min-block-size: 0;
  border: 0;
  background: none;
  color: var(--gray-light);
  cursor: pointer;
  font-size: var(--font-size-base);
  line-height: 1;
}
form {
  grid-column: 1 / -1;
  inline-size: var(--watch-date-width);
  max-inline-size: 100%;
}
label {
  display: block;
  font-size: var(--font-size-small);
}
input {
  inline-size: 100%;
  margin-block: var(--watch-choice-gap);
}
form p {
  font-size: var(--font-size-small);
  white-space: normal;
}
@media (prefers-reduced-motion: reduce) {
  .base {
    transition: none;
  }
}
</style>
