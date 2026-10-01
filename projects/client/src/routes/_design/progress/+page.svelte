<!--
  The progress page as a signed-in owner sees it, on sample rows: the view toggles, the rewatch, drop and hide
  icons, and the Dropped entry. `?view=grid` shows the on-deck grid, `?view=simple` the simple bars,
  `?type=library` the Library tab and `?type=dropped` the Dropped tab (two of the sample shows, dropped). The page
  data's viewer makes the rewatch, drop, hide, refresh and toggle controls live; with a browser session they write to
  that account, so screenshots stub the API.
-->
<script lang="ts">
import { page } from '$app/state';
import { extractPageMeta } from '$lib/api/extractPageMeta';
import type { FilterSource } from '$lib/components/filters/watchNowFilter';
import type { ProgressHide } from '$lib/users/progress/progressHide';
import { isProgressType, type ProgressType, progressTypes } from '$lib/users/progress/progressTypes';
import { progressFixture } from '$lib/users/progress/progressFixture';
import ProgressPage from '$lib/users/progress/ProgressPage.svelte';
import { sumProgressTotals } from '$lib/users/progress/sumProgressTotals';
import { toProgressOnDeck } from '$lib/users/progress/toProgressOnDeck';
import { toProgressRow } from '$lib/users/progress/toProgressRow';
import { toProfileUser } from '$lib/users/toProfileUser';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const now = new Date('2026-09-30T20:00:00.000Z');
const profile = toProfileUser({ username: 'demo', name: 'Demo User', private: false, ids: { slug: 'demo' } });

const view = $derived(page.url.searchParams.get('view'));
const type = $derived.by<ProgressType>(() => {
  const value = page.url.searchParams.get('type') ?? '';
  return isProgressType(value) ? value : 'watched';
});
const kind = $derived(progressTypes[type].kind);
const droppedAt = new Map(progressFixture.dropped.map((row) => [row.show.ids.trakt, row.hidden_at]));
const rows = $derived.by(() => {
  if (type === 'library') return progressFixture.collection;
  if (type === 'dropped') return progressFixture.watched.filter((row) => droppedAt.has(row.show.ids.trakt));
  return progressFixture.watched;
});
const data = $derived({
  type,
  sort: { by: 'added', how: 'asc' as const, supported: true },
  hide: [] as ProgressHide[],
  grid: view === 'grid',
  simple: view === 'simple',
  terms: '',
  watchnow: undefined as string | undefined,
  isSelf: true,
  datePreferences,
  rows: rows.map((row) =>
    toProgressRow({
      row,
      type: kind,
      datePreferences,
      now,
      droppedAt: type === 'dropped' ? droppedAt.get(row.show.ids.trakt) : undefined,
    })
  ),
  onDeck: rows.flatMap((row) => toProgressOnDeck({ row, username: 'demo' }) ?? []),
  total: rows.length,
  page: extractPageMeta(new Headers(), 1),
  totals: Promise.resolve(sumProgressTotals(rows)),
  filterSources: new Map<string, FilterSource>(),
  profile,
  user: page.data.user,
  settings: null,
});
</script>

<div class="demo">
  <ProgressPage {data} />
</div>

<style>
.demo {
  padding-block-start: var(--header-height);
}
</style>
