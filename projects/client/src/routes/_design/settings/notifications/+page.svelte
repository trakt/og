<script lang="ts">
import NotificationsPage from '$lib/settings/NotificationsPage.svelte';
import { sharingSettingsFixture } from '$lib/settings/sharingSettingsFixture';

// The Notifications tab against a fake viewer, so it renders signed out. Saving never reaches the API and always
// succeeds.
const data = { settings: sharingSettingsFixture, expired: false };

function save() {
  return Promise.resolve({ saved: true, errors: [] });
}
</script>

<NotificationsPage {data} {save} />
