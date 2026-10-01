<!--
  A Younify sync's Known Issues: a heading with "Expand" that opens a blue
  notice listing why items might be skipped. It starts closed, like OG's collapse.
-->
<script lang="ts">
import SeeMore from '$lib/components/see-more/SeeMore.svelte';
import SettingsSectionHeading from '$lib/components/settings/SettingsSectionHeading.svelte';
import bugs from '$lib/icons/thin/bugs.svg?raw';

const id = $props.id();
let expanded = $state(false);
</script>

<SettingsSectionHeading icon={bugs} help="If you're having problems, this could be why.">
  {#snippet title()}Known Issues{/snippet}
  {#snippet aside()}
    <SeeMore text="Expand" controls="{id}-issues" {expanded} ontoggle={() => (expanded = !expanded)} />
  {/snippet}
</SettingsSectionHeading>
<div id="{id}-issues" class="issues" hidden={!expanded}>
  <p>We are working on several known issues and these could be why you're seeing skipped items.</p>
  <ul>
    <li>Items that aren't streaming in the United States are currently being ignored.</li>
    <li>Shows that have different episode ordering on the streaming service and TMDB will likely not match up correctly.</li>
    <li>Some services might fail to sign in. For example, international services or streaming accounts managed by your cable company.</li>
    <li>Items already watched in your Trakt history are skipped.</li>
    <li>Watching pre-release items might not sync correctly.</li>
  </ul>
</div>

<style>
/* OG's `.alert.alert-info.inline-notice`, holding a paragraph and a list. */
.issues {
  margin-block-end: var(--settings-section-gap);
  padding: var(--notice-padding);
  border-radius: var(--notice-radius);
  background: var(--brand-info);
  color: var(--color-text-inverse);
  font-size: var(--font-size-settings-alert);

  &[hidden] {
    display: none;
  }
}

p {
  margin-block-end: var(--line-height-computed);
}

ul {
  margin: 0;
}
</style>
