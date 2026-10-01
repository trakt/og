<!--
  The settings avatar: the avatar in a 50px circle and "Upload Avatar". Clicking
  either, or dropping an image on them, picks an image and previews it in the circle. Nothing uploads until the form
  saves, as in OG. OG's drop zone was a div; og's button opens a real file input, so the keyboard can pick one too.
  `onpick` gets the image as a data URI, the shape `PUT /users/avatar` takes.
-->
<script lang="ts">
import SettingsInlineButton from './SettingsInlineButton.svelte';

interface Props {
  /** The button's id. */
  id: string;
  /** The saved avatar, or the picked one's preview. */
  src: string;
  onpick: (dataUri: string) => void;
}

const { id, src, onpick }: Props = $props();
let input = $state<HTMLInputElement>();

function read(file: File | undefined) {
  if (!file?.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') onpick(reader.result);
  };
  reader.readAsDataURL(file);
}

function ondrop(event: DragEvent) {
  event.preventDefault();
  read(event.dataTransfer?.files[0]);
}

function ondragover(event: DragEvent) {
  event.preventDefault();
}
</script>

<div class="dropzone" role="presentation" {ondragover} {ondrop}>
  <!-- The circle repeats the button's click for the mouse, as OG's whole zone did. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <img class="avatar" {src} alt="Your avatar" onclick={() => input?.click()} />
  <SettingsInlineButton {id} onclick={() => input?.click()}>Upload Avatar</SettingsInlineButton>
  <input
    bind:this={input}
    type="file"
    accept="image/*"
    tabindex="-1"
    aria-hidden="true"
    hidden
    onchange={(event) => read(event.currentTarget.files?.[0])}
  />
</div>

<style>
.dropzone {
  display: flex;
  align-items: center;
  gap: var(--settings-inline-button-gap);
}

.avatar {
  flex: none;
  inline-size: var(--settings-avatar-size);
  block-size: var(--settings-avatar-size);
  border: var(--settings-avatar-border) solid var(--color-settings-avatar-border);
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
}
</style>
