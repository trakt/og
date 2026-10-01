<!-- OG's small uppercase link at the right of a panel heading. -->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
// OG's `.fa.fa-long-arrow-right`, which Font Awesome's v4 shim draws as `right-long`.
import arrow from '$lib/icons/solid/right-long.svg?raw';
const { href, text, external = false }: { href: string; text: string; external?: boolean } = $props();
</script>

<!-- The caller passes an already resolved internal route or an absolute external URL. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a {href} target={external ? '_blank' : undefined}
  rel={external ? 'noreferrer' : undefined}>{text} <Icon svg={arrow} /></a>
<style>
a {
  margin-block-start: var(--settings-panel-link-top);
  font-size: var(--font-size-settings-link);
  font-weight: var(--font-weight-headings-light);
}
</style>
