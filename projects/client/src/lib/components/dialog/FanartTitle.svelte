<!--
  The title band on top of OG's item modals: an eyebrow line,
  the title and year in white over the item's darkened fanart. Pass it the id a Dialog `header` snippet hands over.
  `children` sits under the title, like the notes modal's type pill.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  id: string;
  eyebrow: string;
  title: string;
  year?: number | null;
  fanart?: string;
  children?: Snippet;
}

const { id, eyebrow, title, year, fanart, children }: Props = $props();
</script>

<div class="title-wrapper" style:background-image={fanart ? `url(${fanart})` : undefined}>
  <div class="titles">
    <p class="eyebrow">{eyebrow}</p>
    <h2 {id}>
      {title}
      {#if year}<span class="year">{year}</span>{/if}
    </h2>
    {@render children?.()}
  </div>
</div>

<style>
.title-wrapper {
  margin-block-end: var(--gutter);

  @media (width < 768px) {
    margin-block-end: 10px;
  }

  overflow: clip;
  border-radius: var(--radius-dialog) var(--radius-dialog) 0 0;
  background-color: var(--gray-darker);
  background-position: 0% 25%;
  background-size: cover;
}

.titles {
  padding: var(--gutter) var(--space-dialog-wide-inline);
  background-color: var(--color-dialog-fanart-shade);
  color: var(--color-text-inverse);

  @media (width < 768px) {
    padding: var(--space-panel);
  }
}

.eyebrow {
  margin: 0 0 3px;
  font-family: var(--font-headings);
  font-size: var(--font-size-h5);
  font-weight: var(--font-weight-headings-heavy);
  line-height: var(--line-height-headings);
  text-transform: uppercase;
}

h2 {
  margin: 0;
  font-family: var(--font-headings);
  font-size: 22px;
  font-weight: var(--font-weight-headings);
  line-height: 1.2;
  text-shadow: var(--text-shadow-headings);

  @media (width < 768px) {
    font-size: 20px;
  }
}

.year {
  color: var(--gray-light);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-headings-light);

  @media (width < 768px) {
    font-size: 16px;
  }
}
</style>
