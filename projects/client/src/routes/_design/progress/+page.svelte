<!--
  The progress page as its owner sees it, on sample shows: the view toggles, the rewatch, drop and hide icons, and
  the Dropped entry. `?view=grid` shows the poster grid, `?view=simple` the simple bars, `?type=library` the Library
  tab and `?type=dropped` the Dropped tab (two of the sample shows, dropped). The rows carry their catalogs, so
  opening one shows its up-next banner and season picker at once (Severance has a season announced); `?estimates`
  leaves them out, for the collapsed counts. The page data's viewer makes the controls live; with a browser session
  they write to that account, so screenshots stub the API.
-->
<script lang="ts">
import { page } from '$app/state';
import { progressFixture } from '$lib/users/progress/progressFixture';
import ProgressList from '$lib/users/progress/ProgressList.svelte';
import { isProgressType, type ProgressType } from '$lib/users/progress/progressTypes';
import { toProfileUser } from '$lib/users/toProfileUser';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const now = new Date(progressFixture.now);
const profile = toProfileUser({ username: 'demo', name: 'Demo User', private: false, ids: { slug: 'demo' } });

const view = $derived(page.url.searchParams.get('view'));
const expanded = $derived(!page.url.searchParams.has('estimates'));
const type = $derived.by<ProgressType>(() => {
  const value = page.url.searchParams.get('type') ?? '';
  return isProgressType(value) ? value : 'watched';
});
const items = $derived(progressFixture[type](expanded));
const data = $derived({
  type,
  sort: { by: 'added', how: 'asc' as const, supported: true },
  hide: [],
  grid: view === 'grid',
  simple: view === 'simple',
  terms: '',
  list: undefined,
  page: 1,
  options: { includeSpecials: false, includeWatchlisted: false, includeOther: false, useLastActivity: false },
  datePreferences,
  profile,
  user: page.data.user,
});
</script>

<div class="demo">
  <ProgressList {data} {items} {now} />
</div>

<style>
.demo {
  padding-block-start: var(--header-height);
}
</style>
