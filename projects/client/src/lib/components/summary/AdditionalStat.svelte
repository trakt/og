<!--
  One "LABEL value" fact in AdditionalStats. `phoneOnly` rows show under 768px only, like OG's mobile "Links" row.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  label: string;
  phoneOnly?: boolean;
  children: Snippet;
}

const { label, phoneOnly = false, children }: Props = $props();
</script>

<li class={{ 'phone-only': phoneOnly }}>
  <span class="label">{label}</span>
  {@render children()}
</li>

<style>
li {
  display: inline-block;
  margin: 0 var(--gutter) 2px 0;

  & :global(a) {
    color: var(--color-summary-hover);
    text-decoration: none;
    transition: color var(--transition-card);

    &:is(:hover, :focus-visible) {
      color: var(--color-link);
    }
  }
}

.label {
  margin-inline-end: 7px;
  color: var(--color-summary-label);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings);
  text-transform: uppercase;
}

.phone-only {
  @media (width >= 768px) {
    display: none;
  }
}
</style>
