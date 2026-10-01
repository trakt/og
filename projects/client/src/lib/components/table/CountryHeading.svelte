<script lang="ts">
import { flagCountries } from '$lib/components/table/flagCountries';
const { code, name, original = false }: { code: string; name: string; original?: boolean } = $props();
const flags: ReadonlySet<string> = new Set(flagCountries);
const flag = $derived(flags.has(code) ? `/flags/${code}.svg` : undefined);
</script>

<h2>
  {#if flag}<img src={flag} alt="" />{/if}
  {name}
  {#if original}<span>Original Country</span>{/if}
</h2>

<style>
h2 {
  margin: 0;
  font: inherit;
  line-height: var(--line-height-base);
}
img {
  inline-size: var(--data-panel-flag-size);
  block-size: var(--data-panel-flag-size);
  vertical-align: top;
  margin-block-start: calc(-1 * var(--space-xs-block));
  margin-inline-end: var(--space-xs-inline);
}
span {
  float: inline-end;
  margin-block-start: var(--space-xs-block);
  padding: var(--data-panel-label-padding);
  border-radius: var(--radius-certification);
  background: var(--brand-primary);
  color: var(--color-card-text);
  font-size: var(--font-size-card-tag);
  font-weight: var(--font-weight-headings-light);
  line-height: 1;
  text-transform: none;
}
</style>
