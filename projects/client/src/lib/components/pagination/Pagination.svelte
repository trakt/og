<!--
  OG's numbered pagination (Kaminari's `ul.pagination`): a previous arrow, the page window from `pageWindow`, and a
  next arrow. Pass a paginated `PageMeta` from `extractPageMeta`. It renders nothing for a single page, like Kaminari.
  Links keep the current query string and swap `page`; pass `href` to build them another way.
  OG kept the arrows as links on the first and last page; og renders them as disabled text instead.
-->
<script lang="ts">
import { page } from '$app/state';
import Icon from '$lib/icons/Icon.svelte';
import arrowLeft from '$lib/icons/trakt/arrow-left.svg?raw';
import arrowRight from '$lib/icons/trakt/arrow-right.svg?raw';
import ellipse from '$lib/icons/trakt/ellipse.svg?raw';
import { pageHref, pageWindow } from './pageWindow.ts';

interface Props {
  meta: { readonly current: number; readonly total: number };
  href?: (page: number) => string;
  /** Names the nav landmark. Give the top and bottom copies on one page the same label. */
  label?: string;
}

const { meta, href = (n) => pageHref(page.url, n), label = 'Pagination' }: Props = $props();
const slots = $derived(pageWindow(meta.current, meta.total));
</script>

{#snippet arrow(target: number, rel: 'prev' | 'next', name: string, svg: string)}
  <li>
    {#if target < 1 || target > meta.total}
      <span class="disabled" aria-disabled="true"><Icon {svg} label={name} /></span>
    {:else}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href already resolves the current path -->
      <a href={href(target)} {rel}><Icon {svg} label={name} /></a>
    {/if}
  </li>
{/snippet}

{#if meta.total > 1}
  <nav aria-label={label}>
  <ul>
      {@render arrow(meta.current - 1, 'prev', 'Previous page', arrowLeft)}
      {#each slots as slot, i (slot === 'gap' ? `gap-${i}` : slot)}
        <li>
          {#if slot === 'gap'}
            <span class="gap"><Icon svg={ellipse} label="More pages" /></span>
          {:else}
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href already resolves the current path -->
            <a href={href(slot)} aria-current={slot === meta.current ? 'page' : undefined}>{slot}</a>
          {/if}
        </li>
      {/each}
      {@render arrow(meta.current + 1, 'next', 'Next page', arrowRight)}
    </ul>
</nav>
{/if}

<style>
nav {
  text-align: center;
}

ul {
  display: inline-flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

a,
span {
  display: block;
  margin-inline-start: -1px;
  padding: var(--space-base-block) var(--space-base-inline);
  color: var(--color-pagination-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-pagination);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--line-height-base);
  text-decoration: none;
}

li:first-child > * {
  margin-inline-start: 0;
}

a:hover {
  color: var(--brand-primary);
}

a[aria-current='page'] {
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-weight: var(--font-weight-headings-heavy);
}

.disabled {
  color: var(--color-pagination-disabled);
  cursor: not-allowed;
}

.gap {
  cursor: default;
}

a :global(.icon),
span :global(.icon) {
  font-size: var(--font-size-icon-lg);
  margin-block-start: -3px; /* OG nudged the arrows up so they don't grow the row */
}
</style>
