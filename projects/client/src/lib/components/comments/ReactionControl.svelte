<!-- OG's Add Reaction / Edit link and seven-emoji popover. Native popovers provide Escape and light dismiss. -->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import smile from '$lib/icons/solid/face-smile-plus.svg?raw';
import xmark from '$lib/icons/solid/xmark.svg?raw';
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import { reactionOptions } from '$lib/components/comments/reactionOptions';

interface Props {
  value?: typeof reactionOptions[number]['type'];
  busy?: boolean;
  onopen: () => Promise<boolean>;
  onselect: (type: typeof reactionOptions[number]['type']) => void;
}
const { value, busy = false, onopen, onselect }: Props = $props();
const id = $props.id();
const selected = $derived(reactionOptions.find((option) => option.type === value));
let trigger = $state<HTMLButtonElement>();
let popover = $state<HTMLDivElement>();
let expanded = $state(false);
let opening = $state(false);

async function open() {
  if (busy || opening) return;
  opening = true;
  try {
    if (await onopen()) popover?.togglePopover();
  } finally {
    opening = false;
  }
}
function toggle(event: ToggleEvent) {
  expanded = event.newState === 'open';
  if (expanded) {
    (popover?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ??
      popover?.querySelector<HTMLButtonElement>('.choice'))?.focus();
  } else {
    trigger?.focus({ preventScroll: true });
  }
}
function choose(type: typeof reactionOptions[number]['type']) {
  if (busy) return;
  popover?.hidePopover();
  onselect(type);
}
</script>

<button
  bind:this={trigger}
  type="button"
  class="reaction-trigger"
  style:anchor-name="--reaction-{id}"
  aria-label={selected ? `Edit your ${selected.label.toLowerCase()} reaction` : 'Add Reaction'}
  aria-controls="reaction-{id}"
  aria-haspopup="dialog"
  aria-expanded={expanded}
  aria-busy={busy || opening}
  aria-disabled={busy || opening}
  onclick={open}
>
  {#if selected}<span class="emoji-icon" aria-hidden="true">{selected.emoji}</span>{:else}<Icon svg={smile} />{/if}<span class="add-text">{selected ? 'Edit' : 'Add Reaction'}</span>
</button>
<div
  bind:this={popover}
  id="reaction-{id}"
  class="reaction-popover"
  role="dialog"
  aria-label="Choose a reaction"
  popover="auto"
  style:position-anchor="--reaction-{id}"
  ontoggle={toggle}
>
  <Tooltip text="Close" placement="bottom">
    {#snippet trigger(tooltip)}
      <button class="close" type="button" aria-label="Close" onclick={() => popover?.hidePopover()} {...tooltip}>
        <Icon svg={xmark} />
      </button>
    {/snippet}
  </Tooltip>
  {#each reactionOptions as option (option.type)}
    <Tooltip text={option.label} placement="bottom">
      {#snippet trigger(tooltip)}
        <button
          class="choice"
          type="button"
          aria-label={option.label}
          aria-pressed={value === option.type}
          onclick={() => choose(option.type)}
          {...tooltip}
        >
          <span aria-hidden="true">{option.emoji}</span>
        </button>
      {/snippet}
    </Tooltip>
  {/each}
</div>

<style>
.reaction-trigger {
  display: inline-flex;
  align-items: baseline;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-comment-reaction);
  font: inherit;
  text-transform: inherit;
  cursor: pointer;

  & :global(.icon) {
    margin-inline-end: var(--space-sm-inline);
    margin-block-start: var(--reaction-icon-offset);
    font-size: var(--font-size-comment-reaction-icon);
    vertical-align: top;
  }
  &:hover {
    text-decoration: underline;
  }
  &[aria-disabled='true'] {
    cursor: wait;
  }
}
.emoji-icon {
  display: inline-block;
  margin-inline-end: var(--space-sm-inline);
  font-size: var(--font-size-comment-meta);
  vertical-align: middle;
}
.reaction-popover {
  &:popover-open {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  position: fixed;
  position-area: bottom;
  position-try-fallbacks: flip-inline, flip-block;
  inset: auto;
  inline-size: max-content;
  max-inline-size: calc(100vw - var(--gutter));
  margin: var(--reaction-popover-gap) 0;
  padding: var(--reaction-popover-block) var(--reaction-popover-inline);
  overflow: visible;
  border: var(--rating-popover-border-width) solid var(--color-dropdown-border);
  border-radius: var(--radius-rating-popover);
  background: var(--color-box);
  color: var(--color-text);
  box-shadow: var(--shadow-rating-popover);
  font: var(--font-size-comment-meta) / var(--line-height-base) var(--font-body);
  text-align: center;
  text-transform: none;

  &::after {
    content: '';
    position: absolute;
    inset-inline-start: calc(50% - var(--rating-arrow-size));
    inset-block-end: 100%;
    border: var(--rating-arrow-size) solid transparent;
    border-block-end-color: var(--color-box);
  }
  & button {
    display: inline-block;
    min-block-size: 0;
    margin: 0 var(--reaction-choice-margin);
    padding: var(--reaction-choice-block) var(--reaction-choice-inline);
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition: transform var(--reaction-duration), background-color var(--reaction-duration);
    &:hover {
      background: var(--color-reaction-hover);
    }
    &[aria-pressed='true'] {
      background: var(--color-reaction-selected);
    }
  }
  & .close {
    inline-size: var(--reaction-close-width);
    padding-block-start: var(--reaction-close-start);
    margin-block-start: var(--reaction-icon-offset);
    font-size: var(--reaction-close-size);
    line-height: 1;
    vertical-align: middle;
    &:hover {
      background: transparent;
    }
  }
}
@media (prefers-reduced-motion: no-preference) {
  .reaction-popover button:hover {
    transform: scale(var(--reaction-hover-scale));
  }
}
@media (prefers-reduced-motion: reduce) {
  .reaction-popover button {
    transition: none;
  }
}
@media (max-width: 767px) {
  .add-text {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .reaction-popover {
    font-size: var(--reaction-mobile-size);
  }
}
</style>
