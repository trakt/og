<!--
  OG's emoji notice on the settings tabs (`.alert.inline-notice` with a `.side-icon`): a rounded blue (`info`) or red
  (`danger`) band, the emoji floated at the start and each line indented past it (`.indented-line`).
    <SettingsNotice emoji="⚠️" tone="danger">
      <p><b>Deleting anything in this section is permanent and can't be undone!</b></p>
    </SettingsNotice>
-->
<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  emoji: string;
  tone?: 'info' | 'danger';
  children: Snippet;
}

const { emoji, tone = 'info', children }: Props = $props();
</script>

<div class={['notice', tone]}>
  <span class="emoji" aria-hidden="true">{emoji}</span>
  <div class="lines">{@render children()}</div>
</div>

<style>
.notice {
  display: flow-root;
  padding: var(--notice-padding);
  border-radius: var(--notice-radius);
  background-color: var(--brand-info);
  color: var(--color-text-inverse);
  font-size: var(--font-size-settings-alert);
  line-height: var(--line-height-base);
}

.danger {
  background-color: var(--brand-danger);
}

.emoji {
  float: inline-start;
  margin: var(--settings-notice-emoji-margin);
  font-size: var(--settings-notice-emoji-size);
}

.lines {
  margin-inline-start: var(--settings-notice-indent);

  & :global(p) {
    margin: 0;
  }

  /* Bold is in the headings font, whose taller glyphs would otherwise push each line a pixel past OG's. */
  & :global(b) {
    line-height: 1;
  }
}
</style>
