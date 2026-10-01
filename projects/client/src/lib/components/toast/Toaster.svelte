<!--
  OG's toastr: full-width bars under the header, newest on top. Show one with `toast.success(message)` or
  `toast.error(message)` from `./toast.svelte.ts`. Each fades out after 5s. Hovering or focusing one holds it,
  and it goes 1s after the pointer or focus leaves, like OG's timeOut and extendedTimeOut.
-->
<script lang="ts">
import { fade } from 'svelte/transition';
import { toast } from './toast.svelte.ts';

const TIMEOUT = 5000;
const EXTENDED_TIMEOUT = 1000;

// OG faded toasts in over 300ms and out over 2s. Svelte transitions skip base.css's reduced-motion rule.
const duration = (ms: number) => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms);

const autoDismiss = (id: number) => (node: HTMLElement) => {
  const start = (ms: number) => setTimeout(() => toast.dismiss(id), ms);
  let timer = start(TIMEOUT);
  const hold = () => clearTimeout(timer);
  const release = () => {
    clearTimeout(timer);
    timer = start(EXTENDED_TIMEOUT);
  };
  const events = [['pointerenter', hold], ['focusin', hold], ['pointerleave', release], ['focusout', release]] as const;
  events.forEach(([name, handler]) => node.addEventListener(name, handler));
  return () => {
    clearTimeout(timer);
    events.forEach(([name, handler]) => node.removeEventListener(name, handler));
  };
};
</script>

<div class="toaster" aria-live="polite">
  {#each toast.list as { id, type, message } (id)}
    <div
      class={['toast', type]}
      in:fade={{ duration: duration(300) }}
      out:fade={{ duration: duration(2000) }}
      {@attach autoDismiss(id)}
    >
      <button type="button" class="close" aria-label="Close" onclick={() => toast.dismiss(id)}>×</button>
      {message}
    </div>
  {/each}
</div>

<style>
.toaster {
  position: fixed;
  inset-block-start: var(--header-height);
  inset-inline: 0;
  z-index: var(--z-toast);
}

.toast {
  display: flow-root;
  padding: var(--space-panel);
  border-block-end: 2px solid;

  &.success {
    border-color: var(--state-success-border);
    background-color: var(--state-success-bg);
    color: var(--state-success-text);
  }

  &.error {
    border-color: var(--state-danger-border);
    background-color: var(--state-danger-bg);
    color: var(--state-danger-text);
  }
}

/* toastr's close button: a bold × floated right and nudged up into the corner. */
.close {
  position: relative;
  inset-block-start: -0.3em;
  inset-inline-end: -0.3em;
  float: inline-end;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font-size: var(--font-size-toast-close);
  font-weight: bold;
  line-height: 1;
  text-shadow: var(--text-shadow-toast-close);
  opacity: 0.8;

  &:is(:hover, :focus-visible) {
    opacity: 0.4;
  }
}
</style>
