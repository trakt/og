<!-- The "Spoiler Alert?" toggle under a comment textarea. -->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import checkThick from '$lib/icons/trakt/check-thick.svg?raw';
import deleteThick from '$lib/icons/trakt/delete-thick.svg?raw';

let { spoiler = $bindable(false) }: { spoiler?: boolean } = $props();
</script>

<button type="button" class={['spoiler', { on: spoiler }]} aria-pressed={spoiler} onclick={() => (spoiler = !spoiler)}>
  <Icon svg={spoiler ? checkThick : deleteThick} /> Spoiler Alert?
</button>

<style>
/* The edit form's sits on the card, so a surrounding form can set its fill. */
.spoiler {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs-inline);
  padding: var(--comment-form-toggle-padding);
  border: 1px solid var(--color-comment-form-toggle-border);
  border-radius: var(--radius-comment-form-button);
  background-color: var(--comment-toggle-bg, var(--color-comment-form-toggle-bg));
  color: var(--color-comment-form-toggle-text);
  font-family: var(--font-headings);
  font-size: var(--font-size-comment-meta);

  &:hover {
    color: var(--color-comment-form-toggle-hover);
  }

  &.on {
    border-color: var(--color-comment-form-toggle-on);
    background-color: var(--color-comment-form-toggle-on);
    color: var(--color-text-inverse);
  }
}
</style>
