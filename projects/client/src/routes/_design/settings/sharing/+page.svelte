<script lang="ts">
import SharingPage from '$lib/settings/SharingPage.svelte';
import { sharingSettingsFixture } from '$lib/settings/sharingSettingsFixture';

// The Sharing tab against a fake viewer, so it renders signed out. Saving never reaches the API: a "Start
// Watching" text of "fail" fails the way API refuses a save, and anything else succeeds.
const data = { settings: sharingSettingsFixture, expired: false };

function save(body: { sharing_text?: { watching?: unknown } } | null) {
  return Promise.resolve(
    body?.sharing_text?.watching === 'fail'
      ? { saved: false, errors: ["Trakt couldn't save your settings. Please try again."] }
      : { saved: true, errors: [] },
  );
}
</script>

<SharingPage {data} {save} />
