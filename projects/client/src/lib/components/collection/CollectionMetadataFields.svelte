<script lang="ts">
import type { CollectionMetadata } from '$lib/components/collection/CollectionMetadata';
import { collectionFields } from '$lib/components/collection/collectionFields';
interface Props {
  value: CollectionMetadata;
  onsave: (metadata: CollectionMetadata) => void;
  saving?: boolean;
}
const { value, onsave, saving = false }: Props = $props();
const id = $props.id();
let form = $state<HTMLFormElement>();
function submit(event: SubmitEvent) {
  event.preventDefault();
  if (!form) return;
  const data = new FormData(form);
  onsave({
    media_type: String(data.get('media_type') || '') || null,
    resolution: String(data.get('resolution') || '') || null,
    hdr: String(data.get('hdr') || '') || null,
    audio: String(data.get('audio') || '') || null,
    audio_channels: String(data.get('audio_channels') || '') || null,
    '3d': data.get('3d') === 'true',
  });
}
</script>

<form bind:this={form} onsubmit={submit}>
  <div class="fields">
    {#each collectionFields as field (field.key)}
      <div>
        <label for="collection-{id}-{field.key}">{field.label}</label>
        <select id="collection-{id}-{field.key}" name={field.key} value={String(value[field.key] ?? '')}>
          <option value="">{field.key === '3d' ? 'No' : 'None'}</option>
          {#each field.options as [key, label] (key)}<option value={key}>{label}</option>{/each}
        </select>
      </div>
    {/each}
  </div>
  <button type="submit">{saving ? 'Save metadata' : 'Add Metadata'}</button>
</form>

<style>
form {
  inline-size: var(--collection-metadata-width);
  max-inline-size: 100%;
  padding: var(--collection-metadata-padding);
}
.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--collection-metadata-row-gap) var(--collection-metadata-column-gap);
  text-align: start;
}
label {
  display: block;
  padding-block-end: var(--collection-label-gap);
  font: var(--font-weight-headings) var(--font-size-small) / var(--line-height-headings) var(--font-headings);
  text-transform: uppercase;
}
select {
  inline-size: 100%;
  min-inline-size: 0;
}
button {
  inline-size: 100%;
  margin-block-start: var(--collection-metadata-save-gap);
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--brand-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-headings);
  font-weight: var(--font-weight-headings-heavy);
  cursor: pointer;
  &:is(:hover, :focus-visible) {
    background: var(--brand-primary-darken);
  }
}
</style>
