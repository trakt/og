<script lang="ts">
import type { Snippet } from 'svelte';
import RatingHearts from '$lib/components/rating/RatingHearts.svelte';
import { ratingPrompt } from '$lib/components/rating/ratingPrompt';

interface Props {
  label: string;
  value: number | null;
  onrate: (rating: number | null) => void;
  /** Return false when opening starts sign-in instead. */
  onopen?: () => Promise<boolean>;
  busy?: boolean;
  trigger: Snippet<[{ value: number | null; preview: number | null; busy: boolean }]>;
  variant?: 'summary' | 'card';
}
const { label, value, onrate, onopen, busy = false, trigger, variant = 'card' }: Props = $props();
const id = $props.id();
let button = $state<HTMLButtonElement>();
let popover = $state<HTMLDivElement>();
let preview = $state<number | null>(null);
let expanded = $state(false);
const prompt = $derived(ratingPrompt(value, preview));

async function open() {
  if (busy || (onopen && !(await onopen()))) return;
  popover?.togglePopover();
}

function rate(rating: number | null) {
  if (busy) return;
  popover?.hidePopover();
  onrate(rating);
}

function toggle(event: ToggleEvent) {
  expanded = event.newState === 'open';
  if (expanded) {
    (popover?.querySelector<HTMLInputElement>('input:checked') ?? popover?.querySelector<HTMLInputElement>('input'))
      ?.focus();
    return;
  }
  preview = null;
  button?.focus({ preventScroll: true });
}
</script>

<button
  bind:this={button}
  type="button"
  class={['rating-trigger', variant]}
  style:anchor-name="--rating-{id}"
  aria-label={label}
  aria-controls="rating-{id}"
  aria-haspopup="dialog"
  aria-expanded={expanded}
  aria-busy={busy}
  aria-disabled={busy}
  onclick={open}
>
  {@render trigger({ value, preview, busy })}
</button>
<div
  bind:this={popover}
  id="rating-{id}"
  class={['rating-popover', variant]}
  popover="auto"
  role="dialog"
  aria-label={label}
  style:position-anchor="--rating-{id}"
  ontoggle={toggle}
>
  {#if variant === 'card'}
    <p class="prompt" aria-live="polite"><b>{prompt.strong}</b>{prompt.text}</p>
  {/if}
  <div class="body">
    <RatingHearts {value} onrate={rate} onpreview={(rating) => (preview = rating)} />
  </div>
</div>

<style>
.rating-trigger {
  display: block;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  &:focus-visible {
    outline: var(--rating-focus-width) solid var(--color-input-border-focus);
    outline-offset: var(--rating-focus-width);
  }
  &[aria-disabled='true'] {
    cursor: wait;
    opacity: var(--rating-busy-opacity);
  }
  &.summary:has(+ :popover-open) {
    min-inline-size: var(--rating-summary-open-width);
  }
}
.rating-popover {
  position: fixed;
  position-area: bottom;
  position-try-fallbacks: flip-block, flip-inline;
  inset: auto;
  inline-size: var(--rating-popover-width);
  max-inline-size: calc(100vw - var(--gutter));
  margin: var(--rating-popover-gap) 0;
  padding: 0;
  overflow: visible;
  border: var(--rating-popover-border-width) solid var(--color-dropdown-border);
  border-radius: var(--radius-rating-popover);
  background: var(--color-box);
  color: var(--color-text);
  box-shadow: var(--shadow-rating-popover);
  text-align: center;
  font: var(--font-size-base) / var(--line-height-base) var(--font-body);
  text-shadow: none;
  &.summary {
    position-area: top;
    inline-size: max-content;
  }
  &::after {
    content: '';
    position: absolute;
    inset-inline-start: calc(50% - var(--rating-arrow-size));
    inset-block-end: 100%;
    border: var(--rating-arrow-size) solid transparent;
    border-block-end-color: var(--color-box);
  }
  &.summary::after {
    inset-block-start: 100%;
    inset-block-end: auto;
    border-block-end-color: transparent;
    border-block-start-color: var(--color-box);
  }
}
.prompt {
  margin: 0;
  padding: var(--rating-prompt-block) var(--rating-prompt-inline);
  border-block-end: var(--rating-popover-border-width) solid var(--color-menu-divider);
  background: var(--color-rating-prompt);
  border-radius: var(--radius-rating-popover) var(--radius-rating-popover) 0 0;
  font-family: var(--font-headings);
}
.body {
  padding: var(--rating-popover-body-block) var(--rating-popover-body-inline);
  .summary & {
    padding-block-end: var(--rating-summary-body-end);
  }
}
</style>
