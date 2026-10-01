<script lang="ts">
import { page } from '$app/state';
import { type ComponentProps, type Snippet, tick } from 'svelte';
import { rawApiFetch } from '$lib/api/rawApiFetch';
import { authenticatedFetch } from '$lib/auth/authenticatedFetch';
import { userManager } from '$lib/auth/userManager';
import { login } from '$lib/auth/login';
import { overlay } from '$lib/overlay/overlay';
import { toast } from '$lib/components/toast/toast.svelte';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Spinner from '$lib/components/loading/Spinner.svelte';
import Icon from '$lib/icons/Icon.svelte';
import close from '$lib/icons/trakt/delete-thick.svg?raw';
import check from '$lib/icons/trakt/check-thick.svg?raw';
import { watchDateInput } from '$lib/components/history/watchDateInput';
import { watchDateInstant } from '$lib/components/history/watchDateInstant';
import { formatDate } from '$lib/utils/formatDate';
import { changeVisibility } from '$lib/components/visibility/changeVisibility';
import type { VisibilityTarget } from '$lib/components/visibility/VisibilityTarget';

interface Props {
  target: VisibilityTarget;
  action: 'rewatch' | 'drop' | 'restore' | 'hide';
  section?: 'calendar' | 'recommendations' | 'progress_watched' | 'progress_collected';
  variant?: 'side' | 'pill' | 'badge' | 'card';
  small?: boolean;
  tooltip?: string;
  placement?: ComponentProps<typeof Tooltip>['placement'];
  children: Snippet;
  onsave?: () => void;
  /**
   * Called as the save starts, with whether it went through. A page that removes or reloads the item itself (the
   * progress rows) takes over moving the focus, so the control skips its own.
   */
  onsaving?: (saved: Promise<boolean>) => void;
}
const {
  target,
  action,
  section,
  variant = 'side',
  small = false,
  tooltip,
  placement = 'bottom',
  children,
  onsave,
  onsaving,
}: Props = $props();
const id = $props.id();
let button = $state<HTMLButtonElement>();
let popover = $state<HTMLDivElement>();
let field = $state<HTMLInputElement>();
let busy = $state(false);
let expanded = $state(false);
let other = $state(false);
let value = $state('');
let maximum = $state('');
let returnTo: HTMLElement | undefined;
const dates = $derived(page.data.datePreferences);
const dateAction = $derived(action === 'rewatch' || action === 'drop');
const title = $derived(
  action === 'rewatch'
    ? 'When did you start rewatching?'
    : action === 'drop'
    ? 'When did you drop this?'
    : action === 'restore'
    ? 'Restore this show?'
    : `Hide this ${target.type}?`,
);
const label = $derived(
  action === 'rewatch'
    ? 'Rewatch this show'
    : action === 'drop'
    ? 'Drop this show'
    : action === 'restore'
    ? 'Restore this show'
    : `Hide this ${target.type}`,
);
const instant = $derived(watchDateInstant(value, dates.timeZone));
async function open() {
  if (busy) return;
  if (!(await userManager().getUser())?.access_token) return login();
  if (action === 'rewatch' && !page.data.user?.isVip) {
    location.assign('https://trakt.tv/vip/rewatching');
    return;
  }
  returnTo = button?.closest('article')?.querySelector<HTMLElement>('.titles-link') ??
    button?.closest('main')?.querySelector<HTMLElement>('.watch-trigger') ?? button;
  other = false;
  popover?.showPopover();
}
function toggle(event: ToggleEvent) {
  expanded = event.newState === 'open';
  if (expanded) popover?.querySelector<HTMLButtonElement>('.choices button')?.focus();
  else (button?.isConnected ? button : returnTo)?.focus({ preventScroll: true });
}
function otherDate() {
  const now = new Date();
  maximum = watchDateInput(now, dates.timeZone);
  value = watchDateInput(new Date(Math.floor(now.getTime() / 900_000) * 900_000), dates.timeZone);
  other = true;
}
$effect(() => {
  if (other) field?.focus();
});
async function save(at?: string) {
  if (busy) return;
  popover?.hidePopover();
  busy = true;
  try {
    const main = button?.closest('main');
    const articles = [...(main?.querySelectorAll<HTMLElement>('article') ?? [])];
    const current = button?.closest('article');
    const index = articles.findIndex((article) => article === current);
    const saving = changeVisibility({
      target,
      action,
      section,
      at,
      overlay,
      notify: toast,
      request: (path, body) =>
        rawApiFetch({
          path,
          fetch: authenticatedFetch({ manager: userManager() }),
          init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        }),
    });
    onsaving?.(saving);
    if (!onsaving && (action === 'hide' || action === 'drop')) {
      await tick();
      const candidate = [...articles.slice(index + 1), ...articles.slice(0, index).toReversed()]
        .find((article) => article.isConnected && !article.hidden && article.getClientRects().length > 0)
        ?.querySelector<HTMLElement>('a.titles-link, button');
      (candidate ?? main?.querySelector<HTMLElement>('nav[aria-label="Pagination"] a') ?? main)?.focus({
        preventScroll: true,
      });
    }
    if (await saving) onsave?.();
  } finally {
    busy = false;
  }
}
function submit(event: SubmitEvent) {
  event.preventDefault();
  if (!instant || !field?.validity.valid || value > maximum) {
    toast.error('Invalid date format, please use the date picker.');
    return;
  }
  void save(instant);
}
</script>

<span class={['visibility-control', variant]} style:anchor-name="--visibility-{id}">
  <Tooltip text={tooltip ?? label} {placement}>
  {#snippet trigger(tip)}
    <button bind:this={button} type="button" class={['visibility-trigger', variant, { small }]}
      aria-label={label} aria-haspopup="dialog" aria-controls="visibility-{id}" aria-expanded={expanded}
      aria-busy={busy} aria-disabled={busy} onclick={open} {...tip}>
      {#if busy}<Spinner label="Saving {target.title}" />{:else}{@render children()}{/if}
    </button>
  {/snippet}
  </Tooltip>
</span>
<div bind:this={popover} id="visibility-{id}" class="visibility-popover" class:date-action={dateAction} popover="auto"
  role="dialog" aria-label={title}
  style:position-anchor="--visibility-{id}" ontoggle={toggle}>
  <h3>{title}</h3>
  {#if dateAction}<button type="button" class="close" aria-label="Close popover" onclick={() => popover?.hidePopover()}><Icon svg={close} /></button>{/if}
  <div class="choices">
    {#if other}
      <form onsubmit={submit} novalidate>
        <label for="visibility-date-{id}">{action === 'rewatch' ? 'Rewatch' : 'Dropped'} date and time</label>
        <input bind:this={field} bind:value id="visibility-date-{id}" type="datetime-local" required max={maximum} step="900" />
        <p>{instant ? formatDate(instant, { ...dates, format: 'LL', time: true }) : 'Choose a valid date and time.'}</p>
        <button type="submit" aria-label="Save date"><Icon svg={check} /></button>
        <button type="button" class="cancel" aria-label="Cancel other date" onclick={() => { other = false; popover?.querySelector<HTMLButtonElement>('.choices button')?.focus(); }}><Icon svg={close} /></button>
      </form>
    {:else if dateAction}
      <button type="button" onclick={() => save()}>Right now</button>
      <button type="button" onclick={otherDate}>Other date</button>
    {:else}
      <button type="button" onclick={() => save()}>{action === 'restore' ? 'Yes, restore it!' : 'Yes, hide it!'}</button>
      <button type="button" class="cancel" onclick={() => popover?.hidePopover()}>No</button>
    {/if}
  </div>
</div>

<style>
.visibility-control {
  display: inline-flex;
  &.side {
    inline-size: 100%;
  }
}
.visibility-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  &:focus-visible {
    outline: var(--watch-focus) solid var(--color-input-border-focus);
    outline-offset: calc(-1 * var(--watch-focus));
  }
  &[aria-busy='true'] {
    cursor: wait;
  }
  &.side {
    inline-size: 100%;
    block-size: var(--visibility-side-height);
    font-size: var(--visibility-side-size);
    opacity: var(--visibility-side-opacity);
    &:is(:hover, :focus-visible) {
      opacity: 1;
    }
  }
  &.pill {
    padding: var(--watch-history-block) var(--watch-history-inline);
    margin-inline-end: var(--space-xs-inline);
    border-radius: var(--watch-choice-radius);
    background: var(--visibility-pill-bg);
    font-family: var(--font-headings);
    font-size: var(--watch-history-size);
    font-weight: var(--font-weight-headings-heavy);
    &:is(:hover, :focus-visible) {
      background: var(--visibility-pill-hover);
    }
  }
  &.badge {
    font-size: inherit;
    line-height: 1;
  }
  &.card {
    inline-size: var(--watch-card-width);
    block-size: var(--watch-card-height);
    color: var(--gray);
    font-size: var(--font-size-quick-icon);
    &.small {
      inline-size: var(--watch-card-small-width);
      block-size: var(--watch-card-small-height);
      font-size: var(--font-size-quick-icon-small);
    }
    &:is(:hover, :focus-visible) {
      background: var(--gray);
      color: var(--color-card-text);
    }
  }
}
.visibility-popover {
  position: fixed;
  position-area: bottom;
  position-try-fallbacks: --visibility-end, flip-block, flip-inline;
  inset: auto;
  inline-size: max-content;
  &.date-action {
    inline-size: var(--visibility-date-popover-width);
  }
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
h3 {
  margin: 0;
  padding: var(--watch-prompt-block) var(--watch-prompt-inline);
  border-block-end: var(--watch-border) solid var(--color-menu-divider);
  background: var(--color-watch-prompt);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--watch-prompt-line);
  .visibility-popover:has(.close) & {
    padding-inline-end: var(--watch-prompt-close-space);
  }
}
.choices {
  display: flex;
  justify-content: center;
  gap: var(--watch-choice-gap);
  padding: var(--watch-body-block) var(--watch-body-inline);
}
.choices button {
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
@position-try --visibility-end {
  position-area: bottom span-left;
}
</style>
