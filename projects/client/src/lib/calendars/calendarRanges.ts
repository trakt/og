/** The worker's cap on `days`. */
const MAX_DAYS = 33;
// `days=N` covers N + 1 days, end inclusive, so one window covers at most 34 days.
const SPAN = MAX_DAYS + 1;

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * The calendar requests that cover `count` days from `start` (`YYYY-MM-DD`), each day exactly once and each within
 * the worker's cap. The worker reads `days=N` as the start day plus N more, so every range asks for one day less than
 * it covers. The windows share the days evenly (a 35-day month is 18 + 17, not 34 + 1), so none asks for `days=0`: the
 * API client used to leave a 0 path param out of the URL (`api.ts` now keeps it), and the worker fell back to 7 days.
 */
export function calendarRanges(start: string, count: number): { start_date: string; days: number }[] {
  const windows = Math.ceil(count / SPAN);
  const base = Math.floor(count / windows);
  const longer = count % windows;

  return Array.from({ length: windows }, (_, i) => ({
    start_date: addDays(start, i * base + Math.min(i, longer)),
    // A lone day still asks for two, for the same reason.
    days: Math.max(1, base + (i < longer ? 1 : 0) - 1),
  }));
}
