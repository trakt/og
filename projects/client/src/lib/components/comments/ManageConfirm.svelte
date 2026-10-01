<!--
  A card manage icon that asks first, in OG's confirm popover under it: delete, block
  member, and a list's Reset Ranks and Delete , which label the
  icon with `text` and can add a `warning` band.
    <ManageConfirm name="delete" svg={deleteIcon} label="Delete" yes="Yes, delete it!" onconfirm={remove}>
      Delete your comment?
    </ManageConfirm>
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import Icon from '$lib/icons/Icon.svelte';
import Tooltip from '../tooltip/Tooltip.svelte';

interface Props {
  /** The class the card styles it by. */
  name: string;
  svg: string;
  /** The tooltip and accessible name. */
  label: string;
  yes: string;
  onconfirm: () => void;
  /** A visible label after the icon. */
  text?: string;
  /** A line between the question and the choices, like "This can't be undone!". */
  warning?: string;
  busy?: boolean;
  /** The question. */
  children: Snippet;
  disabled?: boolean;
}

const { name, svg, label, yes, onconfirm, text, warning, busy = false, disabled = false, children }: Props = $props();

const id = $props.id();
let popover = $state<HTMLDivElement>();
let button = $state<HTMLButtonElement>();
let expanded = $state(false);

function toggle(event: ToggleEvent) {
  expanded = event.newState === 'open';
  if (expanded) popover?.querySelector('button')?.focus();
  else if (button?.isConnected) button.focus({ preventScroll: true });
}

function confirm() {
  popover?.hidePopover();
  onconfirm();
}
</script>

<span class="confirm {name}" style:anchor-name="--confirm-{id}">
  <Tooltip text={label}>
    {#snippet trigger(tooltip)}
      <button bind:this={button} type="button" aria-label={text ? undefined : label} aria-haspopup="dialog"
        aria-controls="confirm-{id}" aria-expanded={expanded} aria-disabled={busy || undefined} {disabled}
        onclick={() => { if (!busy) popover?.showPopover(); }} {...tooltip}>
        <Icon {svg} />{#if text}<span class="text">{text}</span>{/if}
      </button>
    {/snippet}
  </Tooltip>
  <div bind:this={popover} id="confirm-{id}" class="confirm-popover" popover="auto" role="dialog"
    aria-labelledby="confirm-{id}-title" style:position-anchor="--confirm-{id}" ontoggle={toggle}>
    <h3 id="confirm-{id}-title">{@render children()}</h3>
    {#if warning}<p class="warning">{warning}</p>{/if}
    <div class="choices">
      <button type="button" onclick={confirm}>{yes}</button>
      <button type="button" class="cancel" onclick={() => popover?.hidePopover()}>No</button>
    </div>
  </div>
</span>

<style>
/* The card places it among its manage icons and sets its color. */
.confirm {
  display: inline-flex;
}

.confirm > button {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--confirm-icon-size, var(--font-size-comment-icon));
  line-height: 1;
}

/* `.popover.remove` at, drawn like the other confirm popovers. */
.confirm-popover {
  position: fixed;
  position-area: bottom;
  position-try-fallbacks: flip-block, --confirm-start;
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
  text-transform: none;
  white-space: nowrap;

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
}

.warning {
  margin: 0;
  padding: var(--confirm-warning-padding);
  white-space: normal;
  max-inline-size: var(--list-picker-width);
  background: var(--brand-fifth);
  color: var(--color-text-inverse);
  font-size: var(--font-size-small);
  font-style: italic;
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

@position-try --confirm-start {
  position-area: bottom span-left;
}
</style>
