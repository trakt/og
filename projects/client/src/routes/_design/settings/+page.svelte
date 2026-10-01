<script lang="ts">
import SettingsPage from '$lib/settings/SettingsPage.svelte';
import { settingsFixture } from '$lib/settings/settingsFixture';

const { data: loaded } = $props();

// The General form against a fake viewer, so it renders signed out. Saving never reaches the API: a username of
// "taken" fails the way API refuses one, and anything else succeeds.
const data = $derived({
  settings: settingsFixture,
  user: {
    slug: 'og_tester',
    firstName: 'OG',
    avatarUrl: 'https://media.trakt.tv/hotlink-ok/placeholders/medium/zoidberg.png',
    isVip: true,
  },
  expired: false,
  year: 2026,
  watchNow: loaded.watchNow,
});

function save({ body }: { body: { user?: { username?: unknown } } | null }) {
  const username = body?.user?.username;
  return Promise.resolve(
    username === 'taken' ? { saved: false, errors: ['Username taken is already taken'] } : { saved: true, errors: [] },
  );
}
</script>

<SettingsPage {data} {save} />
