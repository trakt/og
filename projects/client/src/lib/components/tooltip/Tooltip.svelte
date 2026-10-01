<!--
  OG's Bootstrap tooltip: a small black box with an arrow, on a `hint` popover anchored to its trigger.
  The trigger snippet gets the props to spread onto the element the tooltip describes:
    <Tooltip text="Add to watched history" placement="bottom">
      {#snippet trigger(tooltip)}
        <button type="button" aria-label="Add to watched history" {...tooltip}>...</button>
      {/snippet}
    </Tooltip>
  It shows while the mouse is over the trigger (or the tooltip) and while the trigger has keyboard focus, and Esc,
  blur or the mouse leaving hides it. Default tooltips never open on touch; chart tips also toggle on click or tap.
  `text` breaks lines at `\n`; pass `children` instead for markup. Left without either, no tooltip renders.
  The trigger keeps its own accessible name: the tooltip only describes it (`aria-describedby`).
  `toggle` also opens and shuts it on a click, like OG's list notes, so touch can read it too. `variant="notable"` is
  OG's `.notable-tooltip`: left-aligned rich text in a wider box that scrolls.
-->
<script lang="ts">
import type { Snippet } from 'svelte';
import { type Attachment, createAttachmentKey } from 'svelte/attachments';
import { type TooltipEvent, type TooltipState, tooltipState } from './tooltipState.ts';

type TriggerProps = { 'aria-describedby'?: string; [key: symbol]: Attachment<HTMLElement> };

interface Props {
  trigger: Snippet<[TriggerProps]>;
  text?: string;
  children?: Snippet;
  /** Which side of the trigger it shows on. Bootstrap's default is top. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** OG's two-line chart tooltip, without the standard arrow. `notable` is OG's list notes tooltip. */
  variant?: 'default' | 'chart' | 'notable';
  /** A click on the trigger opens and shuts it too. */
  toggle?: boolean;
}

const { trigger, text, children, placement = 'top', variant = 'default', toggle = false }: Props = $props();
const id = $props.id();

let status = $state<TooltipState>({ hovered: false, focused: false, pinned: false, dismissed: false, open: false });
let anchor = $state<HTMLElement>();
let tip = $state<HTMLElement>();

const send = (event: TooltipEvent) => (status = tooltipState(status, event));
const inside = (element: Element | undefined, target: EventTarget | null) =>
  target instanceof Node && Boolean(element?.contains(target));

const attach: Attachment<HTMLElement> = (node) => {
  anchor = node;
  node.style.setProperty('anchor-name', `--tooltip-${id}`);

  const enter = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') send('enter');
  };
  // Moving onto the tooltip itself keeps it open.
  const leave = (event: PointerEvent) => {
    if (!inside(tip, event.relatedTarget)) send('leave');
  };
  // Only keyboard focus: a click or a tap focuses a button too, and shouldn't pop a tooltip.
  const focus = (event: FocusEvent) => {
    if (event.target instanceof Element && event.target.matches(':focus-visible')) send('focus');
  };
  // Removing a focused trigger (a spoiler that reveals itself) fires this while Svelte is tearing the DOM down, where
  // state can't change, so the update waits a microtask.
  const blur = (event: FocusEvent) => {
    if (!inside(node, event.relatedTarget)) queueMicrotask(() => send('blur'));
  };

  const click = (event: MouseEvent) => {
    if (toggle) {
      event.preventDefault();
      send('toggle');
      return;
    }
    if (variant === 'chart') send(status.open ? 'dismiss' : 'focus');
  };
  node.addEventListener('click', click);
  node.addEventListener('pointerenter', enter);
  node.addEventListener('pointerleave', leave);
  node.addEventListener('focusin', focus);
  node.addEventListener('focusout', blur);
  return () => {
    node.removeEventListener('click', click);
    node.removeEventListener('pointerenter', enter);
    node.removeEventListener('pointerleave', leave);
    node.removeEventListener('focusin', focus);
    node.removeEventListener('focusout', blur);
    node.style.removeProperty('anchor-name');
    anchor = undefined;
  };
};

const key = createAttachmentKey();
const hasTip = $derived(Boolean(text) || Boolean(children));
const triggerProps = $derived<TriggerProps>(hasTip ? { 'aria-describedby': `tooltip-${id}`, [key]: attach } : {});

$effect(() => {
  if (!tip || !anchor) return;
  if (status.open === tip.matches(':popover-open')) return;
  if (status.open) tip.showPopover({ source: anchor });
  else tip.hidePopover();
});

// `hint` popovers close on Esc by themselves. Browsers without `hint` treat it as `manual`, so listen too.
$effect(() => {
  if (!status.open) return;
  const escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') send('dismiss');
  };
  document.addEventListener('keydown', escape);
  return () => document.removeEventListener('keydown', escape);
});

// The browser light-dismissed it (Esc, a click elsewhere): stay shut until the next hover or focus.
const closed = (event: ToggleEvent & { currentTarget: HTMLElement }) => {
  if (status.open && !event.currentTarget.matches(':popover-open')) send('dismiss');
};

const leaveTip = (event: PointerEvent) => {
  if (!inside(anchor, event.relatedTarget)) send('leave');
};
</script>

<!--
  Spans, so a tooltip can sit inside a paragraph (comment text) without breaking it, and no whitespace after the
  trigger, which would show up as a space in running text.
-->
{@render trigger(triggerProps)}{#if hasTip}
  <span
  bind:this={tip}
  id="tooltip-{id}"
  class={['tooltip', placement, { chart: variant === 'chart', notable: variant === 'notable' }]}
  popover="hint"
  role="tooltip"
  style:position-anchor="--tooltip-{id}"
  ontoggle={closed}
  onpointerleave={leaveTip}
>
    {#if children}
      <span class="inner">{@render children()}</span>
    {:else}
      <span class="inner text">{text}</span>
    {/if}
  </span>
{/if}

<style>
/*
  The popover box runs from the trigger's edge to the far side of the text, so the pointer can move onto the
  tooltip without a gap closing it. The arrow sits in its padding, 3px off the trigger like Bootstrap's.
*/
.tooltip {
  --edge: calc(var(--tooltip-arrow) + var(--tooltip-offset));
  position: fixed;
  inset: auto;
  inline-size: max-content;
  margin: 0;
  padding: 0;
  overflow: visible;
  border: 0;
  background: none;
  color: var(--color-tooltip-text);
  font-family: var(--font-body);
  font-size: var(--font-size-small);
  font-style: normal;
  font-weight: normal;
  line-height: var(--line-height-tooltip);
  letter-spacing: normal;
  text-align: center;
  text-decoration: none;
  text-shadow: none;
  text-transform: none;
  opacity: var(--opacity-tooltip);
  transition: opacity var(--transition-tooltip), display var(--transition-tooltip) allow-discrete,
    overlay var(--transition-tooltip) allow-discrete;

  @starting-style {
    opacity: 0;
  }

  &:not(:popover-open) {
    opacity: 0;
  }

  &::before {
    content: '';
    position: absolute;
    border: var(--tooltip-arrow) solid transparent;
  }
}

.inner {
  display: block;
  max-inline-size: var(--tooltip-max-width);
  padding: var(--space-tooltip);
  border-radius: var(--radius-tooltip);
  background-color: var(--color-tooltip-bg);
}

/* OG's `.notable-tooltip.tooltip-inner`. */
.notable .inner {
  max-block-size: var(--tooltip-notable-max-height);
  overflow-y: auto;
  padding: var(--space-tooltip-notable);
  text-align: start;

  & :global(p:first-child) {
    margin-block-start: 0;
  }

  & :global(p:last-child) {
    margin-block-end: 0;
  }
}

/* OG joined tooltip lines with <br>. */
.text {
  white-space: pre-line;
}

.top {
  position-area: block-start center;
  padding-block-end: var(--edge);

  &::before {
    inset-block-end: calc(var(--tooltip-offset) - var(--tooltip-arrow));
    inset-inline-start: calc(50% - var(--tooltip-arrow));
    border-block-start-color: var(--color-tooltip-bg);
  }
}

.bottom {
  position-area: block-end center;
  padding-block-start: var(--edge);

  &::before {
    inset-block-start: calc(var(--tooltip-offset) - var(--tooltip-arrow));
    inset-inline-start: calc(50% - var(--tooltip-arrow));
    border-block-end-color: var(--color-tooltip-bg);
  }
}

.left {
  position-area: center inline-start;
  padding-inline-end: var(--edge);

  &::before {
    inset-inline-end: calc(var(--tooltip-offset) - var(--tooltip-arrow));
    inset-block-start: calc(50% - var(--tooltip-arrow));
    border-inline-start-color: var(--color-tooltip-bg);
  }
}

.right {
  position-area: center inline-end;
  padding-inline-start: var(--edge);

  &::before {
    inset-inline-start: calc(var(--tooltip-offset) - var(--tooltip-arrow));
    inset-block-start: calc(50% - var(--tooltip-arrow));
    border-inline-end-color: var(--color-tooltip-bg);
  }
}

.chart {
  --edge: var(--chart-tooltip-offset);
  opacity: 1;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  line-height: var(--line-height-base);
  transition-duration: var(--transition-chart);

  &::before {
    display: none;
  }
  & .inner {
    padding: var(--space-chart-tooltip);
    border: 1px solid var(--color-chart-tooltip-border);
    border-radius: var(--radius-chart-tooltip);
    background: var(--color-chart-tooltip-bg);
    color: var(--color-chart-tooltip-text);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tooltip {
    transition: none;
  }
}
</style>
