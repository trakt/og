<!--
  OG's less and more pill under a dashboard panel. It hangs
  over the panel's bottom edge, centered, so put it last in a `position: relative` panel. `dark` is OG's
  `.page-navigator.dark` for the recommendations band, and `--page-navigator-offset` moves it down from the content. "less" hides at one row and
  "more" at the last, and the pill hides when there's only one row to show. Non-VIPs get links to the VIP page instead.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import circleMinus from '$lib/icons/solid/circle-minus.svg?raw';
import circlePlus from '$lib/icons/solid/circle-plus.svg?raw';

interface Props {
  rows: number;
  maxRows: number;
  onchange: (rows: number) => void;
  /** Left out, the buttons change the rows. Set, they're links there instead, like OG's VIP redirect. */
  upsellHref?: string;
  /** What the rows belong to, for screen readers: "Up Next". */
  label: string;
  /** The black pill with white text, on a dark panel in either theme. */
  dark?: boolean;
}

const { rows, maxRows, onchange, upsellHref, label, dark = false }: Props = $props();
</script>

<!-- The VIP pages aren't built yet, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

{#snippet control(kind: 'less' | 'more', svg: string, next: number)}
  {#if upsellHref}
    <a class="control" href={upsellHref} aria-label="Show {kind} {label} with VIP"><Icon {svg} />{kind}</a>
  {:else}
    <button type="button" class="control" aria-label="Show {kind} {label}" onclick={() => onchange(next)}>
      <Icon {svg} />{kind}
    </button>
  {/if}
{/snippet}

{#if maxRows > 1}
  <div class={['page-navigator', { dark }]}>
    {#if rows > 1}
      {@render control('less', circleMinus, rows - 1)}
    {/if}
    {#if rows < maxRows}
      {@render control('more', circlePlus, rows + 1)}
    {/if}
  </div>
{/if}

<style>
.page-navigator {
  position: absolute;
  inset-inline-start: 50%;
  z-index: 1;
  display: inline-block;
  margin-block-start: var(--page-navigator-offset, -2px);
  border: 1px solid var(--color-page-navigator-border);
  border-radius: var(--radius-page-navigator);
  background-color: var(--color-page-navigator-bg);
  color: var(--color-text);
  translate: -50% 0;
  white-space: nowrap;

  &.dark {
    border-color: var(--color-page-navigator-dark-border);
    background-color: var(--color-page-navigator-dark-bg);
    color: var(--color-page-navigator-dark-text);
  }
}

.control {
  display: inline-block;
  min-block-size: 0;
  margin: var(--space-page-navigator-block) var(--space-page-navigator-inline);
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  font-size: var(--font-size-page-navigator);
  line-height: var(--line-height-base);
  text-decoration: none;
  text-transform: uppercase;
  opacity: var(--opacity-page-navigator);
  cursor: pointer;
  transition: color var(--transition-card), opacity var(--transition-card);

  &:is(:hover, :focus-visible) {
    color: var(--color-link);
    text-decoration: none;
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid var(--color-link);
    outline-offset: 2px;
  }

  & :global(.icon) {
    margin: -2px 5px 0 2px;
    font-size: var(--font-size-page-navigator-icon);
    vertical-align: middle;
  }
}

@media (prefers-reduced-motion: reduce) {
  .control {
    transition: none;
  }
}
</style>
