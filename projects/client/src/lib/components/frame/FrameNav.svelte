<!--
  A link list in the Frame sidebar: an uppercase heading that
  collapses the list, then one big link per page with the current one in red. OG collapsed it by clicking the h3;
  og puts a disclosure button in the heading so the keyboard can do it too. `action` floats an icon link with a
  tooltip at the heading's end (the calendar-clock to the notification settings on the My calendars). `current`
  renders under the current page's link (OG moved the applied filters there), or after the list when no link is
  current.
-->
<script lang="ts">
import Tooltip from '$lib/components/tooltip/Tooltip.svelte';
import Icon from '$lib/icons/Icon.svelte';
import type { Snippet } from 'svelte';
import chevronDown from '$lib/icons/solid/chevron-down.svg?raw';

/** `current` is the page you're on; `'location'` is the section in view, for in-page links (discover's scrollspy). */
/** `hideOnPhone` drops the link below 768px, for a section the page hides there too (OG's `.hidden-xs`). */
type Link = { label: string; href: string; current?: boolean | 'location'; hideOnPhone?: boolean };

interface Props {
  heading: string;
  links: readonly Link[];
  /** An icon link at the heading's end. `label` is its accessible name and its tooltip. */
  action?: { href: string; label: string; svg: string };
  /** Under the current link. */
  current?: Snippet;
  /** Optional controls beside each navigation link, kept outside the link itself. */
  accessory?: Snippet<[number]>;
}

const { heading, links, action, current, accessory }: Props = $props();
const hasCurrent = $derived(links.some((link) => link.current));
const id = $props.id();
let open = $state(true);
</script>

<!-- The hrefs come in built, and some point at OG routes og hasn't built yet, which resolve() rejects. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<nav aria-labelledby="{id}-heading">
  <h3 id="{id}-heading" class={{ collapsed: !open }}>
    <button type="button" aria-expanded={open} aria-controls="{id}-links" onclick={() => (open = !open)}>
      {heading}<Icon svg={chevronDown} />
    </button>
    {#if action}
      <Tooltip text={action.label}>
        {#snippet trigger(tooltip)}
          <a class="action" href={action.href} aria-label={action.label} {...tooltip}><Icon svg={action.svg} /></a>
        {/snippet}
      </Tooltip>
    {/if}
  </h3>
  <ul id="{id}-links" hidden={!open}>
    {#each links as link, index (link.href)}
      <li class={{ 'with-accessory': accessory, 'hide-on-phone': link.hideOnPhone }}>
        <a href={link.href} aria-current={link.current === 'location' ? 'location' : link.current ? 'page' : undefined}>{link.label}</a>
        {#if accessory}<span class="accessory">{@render accessory(index)}</span>{/if}
        {#if link.current}{@render current?.()}{/if}
      </li>
    {/each}
  </ul>
  {#if !hasCurrent}{@render current?.()}{/if}
</nav>

<style>
nav {
  margin-block-start: var(--sidenav-nav-gap);
}

h3 {
  margin: 0 0 var(--space-lg-block);
  padding-block-end: var(--space-sm-block);
  color: var(--color-frame-heading);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;

  &.collapsed {
    margin-block-end: calc(-1 * var(--space-lg-block));
  }
}

button {
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  line-height: inherit;
  text-transform: inherit;
  cursor: row-resize;

  & :global(.icon) {
    margin-inline-start: var(--space-xs-inline);
  }
}

.collapsed :global(.icon) {
  rotate: -180deg;
}

/* OG's `a.notifications`: floated right, pulled up level with the heading, fa-sm. */
.action {
  float: inline-end;
  margin-block-start: -9px;
  color: var(--color-frame-action);
  font-size: 0.875em;

  &:is(:hover, :focus) {
    color: var(--brand-primary);
  }
}

@media (prefers-reduced-motion: no-preference) {
  button :global(.icon) {
    transition: rotate calc(var(--transition-frame) / 2);
  }

  a {
    transition: color var(--transition-frame);
  }
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  position: relative;
  margin-block-end: var(--space-lg-block);
}

.hide-on-phone {
  @media (width < 768px) {
    display: none;
  }
}

.with-accessory > a {
  padding-inline-end: var(--feed-nav-space);
}

.accessory {
  position: absolute;
  inset-inline-end: 0;
  inset-block-start: var(--feed-nav-top);
}

li > a {
  display: block;
  color: var(--color-frame-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-sidenav-link);
  font-weight: var(--font-weight-headings-light);
  line-height: 1;

  &:is(:hover, :focus) {
    color: var(--color-frame-text);
  }

  &[aria-current] {
    color: var(--brand-primary);
    font-weight: var(--font-weight-headings);
  }
}
</style>
