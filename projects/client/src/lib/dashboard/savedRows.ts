/**
 * The row count each dashboard panel remembers. OG saved it on the account (`/settings/row_count`), and the API has no
 * field for it, so og keeps it in this browser, per user and panel.
 */
export const savedRows = {
  read(key: string): number | null {
    try {
      const value = Number.parseInt(localStorage.getItem(storageKey(key)) ?? '', 10);
      return Number.isInteger(value) ? value : null;
    } catch {
      return null;
    }
  },
  write(key: string, rows: number): void {
    try {
      localStorage.setItem(storageKey(key), String(rows));
    } catch {
      // Private mode or a full quota: the count just isn't remembered.
    }
  },
};

function storageKey(key: string) {
  return `og:dashboard-rows:${key}`;
}
