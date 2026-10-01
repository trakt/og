<!--
  OG's dropdown: a default button with a caret, and a menu that drops from its bottom-left corner (Popover API).
  Click, Enter or Space opens it and focus moves to the first item. Esc or a click outside closes it and puts
  focus back on the button, and picking an item closes it too.
    <Dropdown>
      {#snippet trigger()}Watched Date{/snippet}
      <ul>
        <li><a href="..." aria-current="true">Watched Date</a></li>
        <li><a href="...">Title</a></li>
      </ul>
      <hr />
    </Dropdown>
  Rows are ul > li > a (or button). `aria-current` marks the picked one with OG's red check, as does
  `aria-pressed="true"` on a toggle row. <hr> divides, and an li.header labels a group ("TYPES"). An <em> in
  the trigger or a row is OG's gray note ("(Pending)").
  `variant="circle"` is the round translucent icon button with no caret that OG put after a profile name.
  `variant="icon"` is a bare icon with a caret, like OG's filter eye. `variant="transparent"` is OG's
  `.btn-transparent`: the default button's size and caret with no fill, for dark bands (discover's Recent Comments).
-->
<script lang="ts">
import checkThick from '$lib/icons/trakt/check-thick.svg?url';
import type { Snippet } from 'svelte';

interface Props {
  trigger: Snippet;
  children: Snippet;
  /** Names the trigger when its content doesn't (an icon-only button). */
  label?: string;
  variant?: 'default' | 'circle' | 'icon' | 'transparent';
}

const { trigger, children, label, variant = 'default' }: Props = $props();
const id = $props.id();

const focusFirstItem = (event: ToggleEvent & { currentTarget: HTMLElement }) => {
  if (event.newState !== 'open') return;
  event.currentTarget.querySelector<HTMLElement>('a, button')?.focus();
};

const closeOnPick = (event: MouseEvent & { currentTarget: HTMLElement }) => {
  if (!(event.target instanceof Element) || !event.target.closest('a, button')) return;
  event.currentTarget.hidePopover();
};
</script>

<div class="dropdown" style:anchor-name="--dropdown-{id}">
  <button type="button" class={['trigger', variant]} popovertarget="dropdown-{id}" aria-label={label}>
    {@render trigger()}
  </button>
  <div
    id="dropdown-{id}"
    class="menu"
    popover="auto"
    style:position-anchor="--dropdown-{id}"
    style:--check={`url("${checkThick}")`}
    ontoggle={focusFirstItem}
    onclick={closeOnPick}
    role="presentation"
  >
    {@render children()}
  </div>
</div>

<style>
.dropdown {
  display: inline-block;
}

.trigger {
  &::after {
    content: '';
    display: inline-block;
    margin-inline-start: 2px;
    vertical-align: middle;
    border-block-start: 4px solid;
    border-inline: 4px solid transparent;
  }

  .dropdown:has(.menu:popover-open) &.default {
    border-color: var(--color-dropdown-trigger-open-border);
    background-color: var(--color-dropdown-trigger-open-bg);
    box-shadow: var(--shadow-btn-active);
  }

  & :global(em) {
    color: var(--color-dropdown-note);
  }
}

.default {
  border-color: var(--color-dropdown-trigger-border);
  background-color: var(--color-dropdown-trigger-bg);
  color: var(--color-dropdown-trigger-text);
}

.circle {
  inline-size: 28px;
  min-block-size: 0;
  block-size: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background-color: var(--color-btn-circle-bg);
  color: var(--color-text-inverse);
  font-size: var(--font-size-btn-circle);
  line-height: 1;
  vertical-align: middle;
  transition: all 0.5s;

  &::after {
    content: none;
  }

  &:hover,
  .dropdown:has(.menu:popover-open) & {
    background-color: var(--color-btn-circle-bg-hover);
  }
}

.icon {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
}

.transparent {
  border-color: var(--color-dropdown-transparent-border);
  background: none;
  color: var(--color-dropdown-transparent-text);

  &:hover,
  .dropdown:has(.menu:popover-open) & {
    color: var(--color-dropdown-transparent-hover);
  }
}

.menu {
  position: fixed;
  position-area: bottom span-right;
  inset: auto;
  min-inline-size: var(--dropdown-min-width);
  max-block-size: calc(100dvh - var(--gutter));
  overflow-y: auto;
  margin: 2px 0 0;
  padding: var(--space-sm-block) 0;
  border: 1px solid var(--color-dropdown-border);
  border-radius: var(--radius-base);
  background-color: var(--color-box);
  color: var(--color-dropdown-text);
  /* It inherits from where it's placed, which can be a heading. */
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  font-weight: normal;
  letter-spacing: normal;
  text-align: start;
  text-shadow: none;
  text-transform: none;
  box-shadow: var(--shadow-dropdown);
}

.menu :global {
  & ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  & :is(a, button) {
    position: relative;
    display: block;
    inline-size: 100%;
    min-block-size: 0;
    padding: var(--space-dropdown-item-block) var(--gutter);
    border: 0;
    border-radius: 0;
    background: none;
    color: inherit;
    font: inherit;
    line-height: var(--line-height-base);
    text-align: start;
    text-decoration: none;
    white-space: nowrap;

    &:is(:hover, :focus-visible) {
      background-color: var(--color-dropdown-hover-bg);
      color: var(--color-dropdown-hover-text);
    }

    &:is([aria-current]:not([aria-current='false']), [aria-pressed='true']) {
      color: var(--brand-primary);

      /* OG's trakt-font check, 13px, 4px in from the top-left corner. */
      &::before {
        content: '';
        position: absolute;
        inset-block-start: 4px;
        inset-inline-start: 4px;
        inline-size: 13px;
        block-size: 13px;
        background-color: currentcolor;
        mask: var(--check) center / contain no-repeat;
      }
    }
  }

  & em {
    color: var(--color-dropdown-note);
  }

  & .header {
    padding: 3px var(--gutter);
    color: var(--color-dropdown-header);
    font-size: var(--font-size-small);
    text-transform: uppercase;
  }

  & hr {
    margin: 9px 0;
    border: 0;
    border-block-start: 1px solid var(--color-menu-divider);
  }
}
</style>
