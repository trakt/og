<!--
  A settings form's failed save: "⚠️ Your
  settings couldn't be saved!" and one line per message. It's an alert, so a screen reader reads it as it appears,
  and the form moves focus to it, as OG's reload put it at the top of the page.
-->
<script lang="ts">
import type { Attachment } from 'svelte/attachments';

const { errors }: { errors: readonly string[] } = $props();

const focus: Attachment<HTMLElement> = (element) => {
  element.focus();
};
</script>

<div class="alert" role="alert" tabindex="-1" {@attach focus}>
  ⚠️ Your settings couldn't be saved!
  <ul>
    {#each errors as error (error)}<li>{error}</li>{/each}
  </ul>
</div>

<style>
.alert {
  margin-block-end: var(--gutter);
  padding: var(--notice-padding);
  border-radius: var(--notice-radius);
  background-color: var(--brand-danger);
  color: var(--color-text-inverse);
  font-size: var(--font-size-settings-alert);
  scroll-margin-block-start: calc(var(--header-height) + var(--settings-scroll-gap));
}

ul {
  margin: var(--line-height-computed) 0 calc(var(--line-height-computed) / 2);
}
</style>
