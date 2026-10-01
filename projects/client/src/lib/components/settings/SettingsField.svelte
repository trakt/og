<!--
  One row of a settings form (OG's `.form-horizontal .form-group`): the bold label right-aligned in the first three of
  twelve columns, the control in the next seven, and an italic help line after it (OG's `.under-help`). The help sits
  beside a checkbox, as OG's inline span did, and under a full-width control, as its block one did. On phones the label stacks on top.
  `id` is the control's id: the label points at it, and the help is `<id>-help` for the control's aria-describedby.
  A `group` (the birthday's three selects) gets a group role named by the label instead. A `wide` row (the Sharing
  tab's texts) uses OG's `col-sm-2` label and `col-sm-8` control instead.
-->
<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  label: string;
  id: string;
  group?: boolean;
  /** A checkbox row: the control column drops to the checkbox's baseline, like Bootstrap's `.checkbox`. */
  check?: boolean;
  /** The label sits lower, level with the 50px avatar (OG's `.control-label.avatar`). */
  tall?: boolean;
  wide?: boolean;
  help?: Snippet;
  children: Snippet;
}

const { label, id, group = false, check = false, tall = false, wide = false, help, children }: Props = $props();
</script>

<div class={['field', { check, tall, wide }]}>
  {#if group}
    <span class="label" id="{id}-label">{label}:</span>
    <div class="control" role="group" aria-labelledby="{id}-label">
      <!-- No space before the help: OG's sits 5px after a checkbox, which is the checkbox's own margin. -->
      {@render children()}{#if help}<span class="help" id="{id}-help">{@render help()}</span>{/if}
    </div>
  {:else}
    <label class="label" for={id}>{label}:</label>
    <div class="control">
      <!-- No space before the help: OG's sits 5px after a checkbox, which is the checkbox's own margin. -->
      {@render children()}{#if help}<span class="help" id="{id}-help">{@render help()}</span>{/if}
    </div>
  {/if}
</div>

<style>
.field {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin-block-end: var(--settings-field-gap);

  @media (min-width: 768px) {
    grid-template-columns:
      calc((100% + var(--gutter)) * 3 / 12 - var(--gutter))
      calc((100% + var(--gutter)) * 7 / 12 - var(--gutter));
    column-gap: var(--gutter);
  }

  @media (min-width: 768px) {
    &.wide {
      grid-template-columns:
        calc((100% + var(--gutter)) * 2 / 12 - var(--gutter))
        calc((100% + var(--gutter)) * 8 / 12 - var(--gutter));
    }
  }
}

.label {
  display: block;
  margin-block-end: var(--space-sm-block);
  font-weight: var(--font-weight-headings-heavy);

  @media (min-width: 768px) {
    margin-block-end: 0;
    padding-block-start: var(--settings-label-top);
    text-align: end;

    .tall & {
      padding-block-start: var(--settings-label-top-tall);
    }
  }
}

.control {
  min-inline-size: 0;

  .check & {
    min-block-size: var(--settings-check-min-height);
    padding-block-start: var(--settings-label-top);
  }

  /* Bootstrap's .form-control is a full-width block; `.inline` controls sit side by side (OG's .inline-selects). */
  & :global(:is(input:not([type='checkbox'], [type='file']), select, textarea):not(.inline)) {
    display: block;
    inline-size: 100%;
  }

  & :global(input[type='checkbox']) {
    margin: var(--settings-checkbox-margin);
    vertical-align: top;
  }
}

.help {
  color: var(--color-text-muted);

  /* Bold text in the headings font would stretch the line past OG's. */
  & :global(b) {
    line-height: 1;
  }

  /* Beside a checkbox, OG's sat on the checkbox wrapper's lower baseline. */
  .check & {
    vertical-align: var(--settings-check-help-drop);
  }

  /* Under a full-width control it's OG's block `.under-help`. */
  .field:not(.check) & {
    display: block;
    margin-block-start: var(--settings-help-gap);
  }

  font-size: var(--font-size-small);
  font-style: italic;
}
</style>
