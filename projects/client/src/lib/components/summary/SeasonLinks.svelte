<!--
  OG's `.subnav-wrapper.season-links` under a show's fanart: a label ("Order", "Season") and a row of links with the
  current one in bold. Render it in SummaryFrame's `subnav` slot. A long row scrolls sideways.
-->
<script lang="ts">
import type { Attachment } from 'svelte/attachments';
import Container from '$lib/components/container/Container.svelte';

interface Link {
  readonly text: string;
  readonly href: string;
  readonly selected?: boolean;
}

const { label, links }: { label: string; links: readonly Link[] } = $props();
const revealSelected: Attachment<HTMLUListElement> = (element) => {
  const selected = links.findIndex((link) => link.selected);
  const item = element.children.item(selected);
  if (item instanceof HTMLElement) element.scrollLeft = item.offsetLeft - element.offsetLeft;
};
</script>

<!-- Hrefs come in as props, and resolve() only takes literal routes. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<nav class="season-links" aria-label={label}>
  <Container>
    <div class="inner">
      <span class="label" aria-hidden="true">{label}</span>
      <ul {@attach revealSelected}>
        {#each links as link (link.href)}
          <li>
            <a href={link.href} class={{ selected: link.selected }} aria-current={link.selected ? 'page' : undefined}
            >{link.text}</a>
          </li>
        {/each}
      </ul>
    </div>
  </Container>
</nav>

<style>
.season-links {
  background: var(--color-toolbar-bg);
  color: var(--color-season-links-label);
  line-height: var(--season-links-height);
}

.inner {
  display: flex;
  padding-inline-start: var(--summary-offset);

  @media (width < 992px) {
    padding-inline-start: var(--summary-offset-sm);
  }

  @media (width < 768px) {
    padding-inline-start: 0;
  }
}

.label {
  flex: none;
  margin-inline-end: 10px;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  text-transform: uppercase;
}

ul {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  white-space: nowrap;
  list-style: none;
  scrollbar-width: none;
}

a {
  color: var(--color-season-link);
  text-decoration: none;

  &:hover {
    color: var(--brand-primary);
    text-decoration: none;
  }
}

.selected {
  color: var(--color-season-link-selected);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
}
</style>
