<script lang="ts">
import Container from '$lib/components/container/Container.svelte';
import background from '$lib/assets/poster-bg.jpg';
const { current = 'hidden' }: { current?: string } = $props();
const tabs = [['General', ''], ['Data', 'data'], ['Sharing', 'sharing'], ['Notifications', 'notifications'], [
  'Hidden Items',
  'hidden',
], ['Advanced', 'advanced']];
</script>
<!-- Settings tabs include routes built by the later settings issues. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<header class="settings-header" style:--poster-wall={`url(${background})`}>
  <Container>
    <h1>Settings</h1>
  </Container>
  <nav aria-label="Settings">
    <Container>
    {#each tabs as [label, path] (path)}
      <a href="/settings{path ? `/${path}` : ''}" aria-current={current === path ? 'page' : undefined}>{label}</a>
    {/each}
  </Container>
  </nav>
</header>
<style>
.settings-header {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding-block: calc(var(--header-height) + var(--gutter)) var(--settings-header-bottom);
  background: var(--color-settings-header-bg);
  text-align: center;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--poster-wall) center / var(--settings-poster-tile);
    opacity: var(--settings-poster-opacity);
    filter: blur(var(--settings-poster-blur));
  }
}
h1 {
  margin: 0;
  color: var(--color-text-inverse);
  text-shadow: var(--text-shadow-headings);
}
nav {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  overflow-x: auto;
  background: var(--color-settings-tabs-bg);
  white-space: nowrap;
}
a {
  display: inline-block;
  padding-inline: var(--settings-tab-inline);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  line-height: var(--settings-tabs-height);
  text-decoration: none;
  &:is(:hover, :focus-visible),
  &[aria-current] {
    color: var(--brand-primary);
  }
  &[aria-current] {
    font-family: var(--font-headings-heavy);
  }
}
</style>
