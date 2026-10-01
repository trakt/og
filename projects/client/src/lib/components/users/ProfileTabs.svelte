<!--
  OG's profile section tabs: a dark translucent row of links along the
  bottom of the profile cover, the current one red. Put it inside a positioned cover.
-->
<script lang="ts">
import type { ProfileTab } from '$lib/users/profileTabs';

const { tabs }: { tabs: readonly ProfileTab[] } = $props();
</script>

<!-- Tabs point at profile subpages other issues build, and resolve() only takes routes that exist. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<nav class="profile-tabs" aria-label="Profile">
  <div class="links">
    {#each tabs as tab (tab.href)}
      <a href={tab.href} aria-current={tab.current ? 'page' : undefined}>{tab.label}</a>
    {/each}
  </div>
</nav>

<style>
.profile-tabs {
  position: absolute;
  inset-block-end: 0;
  inline-size: 100%;
  block-size: var(--profile-tabs-height);
  background-color: var(--color-profile-tabs-bg);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-light);
  text-align: center;
}

.links {
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: none;
}

a {
  display: inline-block;
  padding: 0 var(--profile-tab-padding);
  color: var(--color-text-inverse);
  line-height: var(--profile-tabs-height);

  &:hover,
  &:focus {
    color: var(--brand-primary);
    text-decoration: none;
  }

  &:focus-visible {
    outline-offset: -2px;
  }

  &[aria-current='page'] {
    color: var(--brand-primary);
    font-weight: var(--font-weight-headings);
  }
}
</style>
