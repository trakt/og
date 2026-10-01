<!--
  A header dropdown: a trigger button and a popover menu under it. Like OG it opens on mouse hover.
  Click, tap, Enter and Space open it too (show, not toggle, so the click after a hover doesn't shut it),
  and Esc, a click outside or the mouse leaving closes it (Popover API).
  `center` hangs a 320px menu centered under the trigger with an arrow (Apps). `end` lines the menu up
  with the trigger's right edge and turns the trigger into a solid tab while open (profile, mobile links).
-->
<script lang="ts">
import { afterNavigate } from '$app/navigation';
import type { Snippet } from 'svelte';

interface Props {
  trigger: Snippet;
  children: Snippet;
  align: 'center' | 'end';
  /** Names the trigger when its content doesn't (an icon-only button). */
  label?: string;
}

const { trigger, children, align, label }: Props = $props();
const id = $props.id();
let menu = $state<HTMLElement>();

// Mouse hover opens the menu like OG. Touch skips it, so a tap toggles the popover once instead of twice.
const openOnHover = (root: HTMLElement) => {
  const hover = (open: boolean) => (event: PointerEvent) => {
    if (event.pointerType === 'mouse') menu?.togglePopover(open);
  };
  const enter = hover(true);
  const leave = hover(false);
  root.addEventListener('pointerenter', enter);
  root.addEventListener('pointerleave', leave);
  return () => {
    root.removeEventListener('pointerenter', enter);
    root.removeEventListener('pointerleave', leave);
  };
};

// Client-side navigation keeps the page, so close the menu once a link in it has done its job.
afterNavigate(() => menu?.hidePopover());
</script>

<div
  class={['header-menu', align]}
  style:anchor-name="--menu-{id}"
  {@attach openOnHover}
>
  <button type="button" class="trigger" popovertarget="menu-{id}" popovertargetaction="show"
    aria-label={label}>{@render trigger()}</button>
  <div bind:this={menu} id="menu-{id}" class="menu" popover="auto" style:position-anchor="--menu-{id}">
    {@render children()}
  </div>
</div>

<style>
.header-menu {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  min-block-size: 0;
  border: 0;
  background: none;
  color: var(--color-header-text);
  font: inherit;
  text-shadow: var(--text-shadow-headings);
  transition: color 0.5s;
}

.menu {
  position: fixed;
  inset: auto;
  margin: 0;
  padding: var(--space-lg-block) 0;
  border: 0;
  background-color: var(--color-box);
  color: var(--color-menu-text);
  font-size: var(--font-size-base);
  text-align: start;
  box-shadow: var(--shadow-dropdown);
  max-block-size: calc(100vh - var(--header-height));
  overflow-y: auto;
}

/* Menu rows: ul > li > a (or button), with <hr> as the divider. */
.menu :global {
  & ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  & :is(a, button) {
    display: block;
    inline-size: 100%;
    min-block-size: 0;
    padding: var(--space-base-block) var(--space-lg-inline);
    border: 0;
    border-radius: 0;
    background: none;
    color: inherit;
    font: inherit;
    line-height: var(--line-height-base);
    text-align: start;
    text-decoration: none;
    transition: background-color 0.25s, color 0.25s;

    &:is(:hover, :focus-visible) {
      background-color: var(--brand-primary);
      color: var(--color-header-text);
    }
  }

  & hr {
    margin: 9px 0;
    border: 0;
    border-block-start: 1px solid var(--color-menu-divider);
  }
}

/* Apps: centered under the link, rounded all round, an arrow pointing up at the link. */
.center {
  & .menu {
    position-area: bottom center;
    /* OG's 320px, grown to fit: Montserrat runs wider than OG's Proxima Nova. */
    min-inline-size: 320px;
    inline-size: max-content;
    border-radius: var(--radius-lg);
  }

  &:has(.menu:popover-open) {
    & .trigger {
      color: var(--brand-primary);
      text-shadow: none;
    }

    &::before {
      content: '';
      position: absolute;
      inset-block-start: calc(100% - 6px);
      inset-inline-start: 50%;
      translate: -50% 0;
      border-inline: 10px solid transparent;
      border-block-end: 6px solid var(--color-box);
    }
  }
}

/* Profile and mobile links: the trigger becomes a solid tab and the menu hangs off its right edge. */
.end {
  & .menu {
    position-area: bottom span-left;
    min-inline-size: max(130px, anchor-size(inline));
    border-block-start: 1px solid var(--brand-primary);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }

  &:has(.menu:popover-open) .trigger {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    background-color: var(--color-box);
    color: var(--color-header-active-text);
    text-shadow: none;
  }
}
</style>
