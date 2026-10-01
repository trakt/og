<!--
  A settings form's submit row (OG's `.form-group.buttons-wrapper`): the centered uppercase button, stuck to the
  bottom of the window over a frosted strip while the form runs past it, with a rule on top once it's stuck.
-->
<script lang="ts">
import type { Attachment } from 'svelte/attachments';

const { label = 'Save Settings', busy = false }: { label?: string; busy?: boolean } = $props();
let pinned = $state(false);

// OG's IntersectionObserver trick (settings.js:1506-1512): stuck 1px past the bottom, the bar is never fully in view.
const pin: Attachment<HTMLElement> = (element) => {
  const observer = new IntersectionObserver(([entry]) => {
    pinned = (entry?.intersectionRatio ?? 1) < 1;
  }, { threshold: [1] });
  observer.observe(element);
  return () => observer.disconnect();
};
</script>

<div class={['save-bar', { pinned }]} {@attach pin}>
  <button type="submit" disabled={busy} aria-busy={busy}>{label}</button>
</div>

<style>
.save-bar {
  position: sticky;
  inset-block-end: -1px;
  z-index: 1;
  margin-block-end: var(--settings-field-gap);
  margin-inline: calc(var(--gutter) / -2);
  padding: var(--settings-save-padding);
  border-block-start: 1px solid transparent;
  background-color: var(--color-settings-save-bg);
  backdrop-filter: blur(var(--settings-save-blur));
  text-align: center;

  &.pinned {
    border-block-start-color: var(--color-settings-save-border);
  }
}

button {
  padding: var(--settings-save-button-padding);
  border-color: var(--color-btn-primary-border);
  border-radius: var(--radius-lg);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-size: var(--font-size-dialog-submit);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>
