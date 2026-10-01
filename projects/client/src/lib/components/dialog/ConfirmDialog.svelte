<!--
  A yes-or-no question before a destructive action, in OG's modal: the question, then Cancel and the red action
  button. It stands in for OG's native `confirm()`, so Cancel comes first and takes the focus, and Esc cancels.
    <ConfirmDialog bind:open title="Delete Account" yes="Delete Account" onconfirm={remove}>
      Permanently delete your Trakt account?
    </ConfirmDialog>
-->
<script lang="ts">
import Dialog from '$lib/components/dialog/Dialog.svelte';
import type { Snippet } from 'svelte';

interface Props {
  open: boolean;
  title: string;
  /** The action button's label. */
  yes: string;
  onconfirm: () => void;
  children: Snippet;
}

let { open = $bindable(), title, yes, onconfirm, children }: Props = $props();

function confirm() {
  open = false;
  onconfirm();
}
</script>

<Dialog bind:open {title} size="md">
  <div class="question">{@render children()}</div>
  <div class="choices">
    <button type="button" class="cancel" onclick={() => (open = false)}>Cancel</button>
    <button type="button" class="yes" onclick={confirm}>{yes}</button>
  </div>
</Dialog>

<style>
.question :global(p) {
  margin: 0 0 var(--space-panel);
}

.choices {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm-inline);
  margin-block-start: var(--gutter);
}

button {
  border-radius: var(--radius-lg);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;
}

.yes {
  border-color: var(--color-btn-primary-border);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}
</style>
