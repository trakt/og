import { loadWatchNowChoices } from '../../../lib/settings/loadWatchNowChoices.ts';
import { settingsFixture } from '../../../lib/settings/settingsFixture.ts';

/** The fake viewer's Watch Now countries and services come from the real API, which doesn't need a session. */
export async function load({ fetch }) {
  const { country, favorites } = settingsFixture.browsing.watchnow;
  return { watchNow: await loadWatchNowChoices({ fetch, country, favorites }) };
}
