<!--
  The sidebar's section links on a summary page (OG's `ul.nav.sections`): anchors down the page, some with a
  circled arrow to the full subpage ("All cast & crew").
  The settings sidebar uses it with `spy` off (OG never marked the panel in view there) and `ruled`, which adds a rule
  above the first link and drops the top margin.
-->
<script lang="ts">
import type { Attachment } from 'svelte/attachments';
import SeeMore from '$lib/components/see-more/SeeMore.svelte';

interface Section {
  readonly label: string;
  /** Usually an anchor on the page, like `#actors`. */
  readonly href: string;
  readonly more?: { readonly href: string; readonly text: string };
}

interface Props {
  sections: readonly Section[];
  label?: string;
  /** Marks the section in view as the page scrolls. */
  spy?: boolean;
  ruled?: boolean;
}

const { sections, label = 'Sections', spy = true, ruled = false }: Props = $props();
const first = () => sections.at(0)?.href;
// svelte-ignore state_referenced_locally
let current = $state(spy ? first() : undefined);
const track: Attachment<HTMLElement> = () => {
  if (!spy) return;
  let frame = 0;
  const update = () => {
    const targets = sections.map(({ href }) => ({ href, element: document.getElementById(href.slice(1)) }));
    // The header and a small reading gap, measured from the existing design token.
    const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) + 60;
    current = targets.filter(({ element }) => element && element.getBoundingClientRect().top <= offset).at(-1)?.href ??
      targets.at(0)?.href;
  };
  const scroll = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll', scroll, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', scroll);
  };
};
</script>

<!-- Anchors and subpages og hasn't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<nav class={{ ruled }} aria-label={label} {@attach track}>
  <ul>
    {#each sections as section (section.href)}
      <li>
        <a class="section" href={section.href} aria-current={section.href === current ? 'location' : undefined}>{section.label}</a>
        {#if section.more}
          <span class="more"><SeeMore href={section.more.href} text={section.more.text} iconOnly /></span>
        {/if}
      </li>
    {/each}
  </ul>
</nav>

<style>
ul {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

li {
  position: relative;
  border-block-end: 1px solid var(--color-summary-separator);
}

.ruled {
  & ul {
    margin-block-start: 0;
  }

  & li:first-child {
    border-block-start: 1px solid var(--color-summary-separator);
  }
}

.section {
  display: block;
  padding-block: 7px;
  color: var(--color-summary-label);
  font-family: var(--font-headings);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-headings);
  text-transform: uppercase;
  text-decoration: none;
  transition: color var(--transition-card);

  /* OG's scrollspy `li.active a`. */
  &:is(:hover, :focus-visible, [aria-current]) {
    color: var(--color-summary-hover);
    text-decoration: none;
  }
}

.more {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  padding-block: 5px 6px;

  /* OG's sidebar gave its arrows the section links' gray, not the link red. */
  & :global(a) {
    color: var(--color-summary-label);
  }

  & :global(a:is(:hover, :focus-visible)) {
    color: var(--color-summary-hover);
    text-decoration: none;
  }
}
</style>
