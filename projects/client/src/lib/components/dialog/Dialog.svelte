<!--
  OG's modal: a rounded panel centered over a dimmed page, with a title bar and a close button in the corner.
  A native modal <dialog>: it moves focus to the first control inside (or the one marked `autofocus`), keeps
  focus inside while open, closes on Esc and hands focus back to whatever opened it.
    <Dialog bind:open title="Report item" size="md">...</Dialog>
  `lightDismiss` also closes it on a backdrop click, like OG's Watch Now modal. OG's report modals stay open.
  `backdrop` blurs an image (the item's fanart) over a black backdrop, like OG's check-in modal.
  `header` replaces the title bar (it gets the id to label the dialog with), and `footer` sits under the panel,
  on the backdrop, like the Watch Now modal's country picker.
-->
<script lang="ts">
import Icon from '$lib/icons/Icon.svelte';
import deleteThick from '$lib/icons/trakt/delete-thick.svg?raw';
import type { Snippet } from 'svelte';

interface Props {
  open: boolean;
  /** Names the dialog. Only shown when there's no `header`. */
  title: string;
  /**
   * 360px like OG's check-in modal, 440px like its notes modal, 500px like its report modals, 600px like `.wider`, or
   * 690px like Watch Now.
   */
  size?: 'sm' | 'notes' | 'md' | 'lg' | 'xl';
  lightDismiss?: boolean;
  /** OG's report panels have tighter top corners than item modals. */
  variant?: 'report';
  /** Avatar over the top edge, like OG’s new-list modal. */
  avatar?: string;
  backdrop?: string;
  onclose?: () => void;
  /** Gets the id its heading needs, so the dialog stays labelled. */
  header?: Snippet<[string]>;
  footer?: Snippet;
  children: Snippet;
}

let {
  open = $bindable(),
  title,
  size = 'sm',
  lightDismiss = false,
  header,
  footer,
  children,
  avatar,
  backdrop,
  onclose,
  variant,
}: Props = $props();
const id = $props.id();

// Reads `open`, so it re-runs whenever the prop changes.
const syncOpen = (dialog: HTMLDialogElement) => {
  if (open && !dialog.open) dialog.showModal();
  if (!open && dialog.open) dialog.close();
};
</script>

<dialog
  class={['dialog', size, variant, { 'image-backdrop': backdrop }]}
  aria-labelledby="{id}-title"
  closedby={lightDismiss ? 'any' : 'closerequest'}
  onclose={() => { open = false; onclose?.(); }}
  {@attach syncOpen}
>
  {#if backdrop}<div class="backdrop-image" style:background-image={`url("${backdrop}")`}></div>{/if}
  <div class="panel">
    {#if header}
      {@render header(`${id}-title`)}
    {:else}
      <h2 id="{id}-title" class="title">{title}</h2>
    {/if}
    <div class={{ body: !header }}>{@render children()}</div>
    <!-- Last, so opening focuses the first control in the body like OG did. -->
    <button type="button" class="close" onclick={() => { open = false; onclose?.(); }}>
      <Icon svg={deleteThick} label="Close" />
    </button>
  </div>
  {#if avatar}<img class="avatar" src={avatar} alt="" />{/if}
  {@render footer?.()}
</dialog>

<style>
.dialog {
  inline-size: var(--dialog-width);
  max-inline-size: 90%;
  max-block-size: calc(100dvh - 2 * var(--gutter));
  padding: 0;
  overflow: visible;
  border: 0;
  background: none;
  color: var(--color-text);

  /* The panel scrolls rather than the dialog, so its shadow isn't clipped. */
  &[open] {
    display: flex;
    flex-direction: column;
  }

  &::backdrop {
    background-color: var(--color-backdrop);
  }

  &.image-backdrop::backdrop {
    background-color: var(--color-backdrop-image);
  }

  &.report {
    inset-block-start: var(--header-height);
    max-block-size: calc(100dvh - var(--header-height) - 2 * var(--gutter));
  }

  &.notes {
    inline-size: var(--dialog-width-notes);
  }

  &.md {
    inline-size: var(--dialog-width-md);
  }

  &.lg {
    inline-size: var(--dialog-width-lg);
  }

  &.xl {
    inline-size: var(--dialog-width-xl);
  }
}

.backdrop-image {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: center / cover;
  filter: var(--blur-dialog-backdrop);
  pointer-events: none;
}

.avatar {
  position: absolute;
  inset-block-start: calc(-1 * var(--list-avatar-size) / 2);
  inset-inline-start: calc(50% - var(--list-avatar-size) / 2);
  inline-size: var(--list-avatar-size);
  block-size: var(--list-avatar-size);
  border: var(--list-avatar-border) solid var(--color-box);
  border-radius: 50%;
  box-shadow: var(--shadow-dialog);
}

.panel {
  position: relative;
  min-block-size: 0;
  overflow-y: auto;
  border-radius: var(--radius-dialog);
  .report & {
    border-radius: var(--radius-report);
  }
  background-color: var(--color-dialog-bg);
  box-shadow: var(--shadow-dialog);
}

@media (prefers-reduced-motion: no-preference) {
  .dialog[open],
  .dialog[open]::backdrop {
    transition: opacity 0.3s linear;

    @starting-style {
      opacity: 0;
    }
  }
}

.title {
  margin: 0;
  padding: var(--space-panel) var(--space-dialog-inline);
  border-block-end: 1px solid var(--color-dialog-title-border);
  background-color: var(--color-dialog-title-bg);
  color: var(--color-dialog-title-text);
  font-size: var(--font-size-dialog-title);
  font-weight: var(--font-weight-headings);
  text-transform: uppercase;
}

.body {
  padding: var(--space-panel) var(--space-dialog-inline) var(--space-dialog-inline);
}

.close {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  min-block-size: 0;
  padding: var(--space-sm-inline);
  border: 0;
  background: none;
  color: var(--color-dialog-close);
}
</style>
