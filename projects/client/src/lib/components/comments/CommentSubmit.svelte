<!-- A comment form's "Submit", with OG's spinner while it posts . -->
<script lang="ts">
import Spinner from '../loading/Spinner.svelte';

const { posting, label, small = false }: { posting: boolean; label: string; small?: boolean } = $props();
</script>

<button type="submit" class={['submit', { small }]} aria-busy={posting}>
  {#if posting}<Spinner {label} />{:else}Submit{/if}
</button>

<style>
.submit {
  border-color: var(--color-btn-primary-border);
  border-radius: var(--radius-comment-form-button);
  background-color: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  text-transform: uppercase;

  &:is(:hover, :focus-visible) {
    background-color: var(--brand-primary-darken);
  }
}

/* The edit form's (`.new-comment-wrapper.update .btn-primary`). */
.small {
  padding: var(--comment-edit-submit-padding);
}
</style>
