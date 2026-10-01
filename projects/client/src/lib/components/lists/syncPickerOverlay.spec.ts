import { describe, expect, it } from 'vitest';
import { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import { syncPickerOverlay } from './syncPickerOverlay.ts';
describe('syncPickerOverlay', () => {
  it('should reconcile fresh membership for people and seasons without changing other items', () => {
    const overlay = createOverlay({
      get: () => Promise.resolve(new Response(null, { status: 503 })),
      storage: { load: () => Promise.resolve([]), save: () => Promise.resolve(), clearExcept: () => Promise.resolve() },
    });
    syncPickerOverlay({ overlay, target: { type: 'person', id: 1, title: 'Actor' }, listed: true, watchlisted: false });
    syncPickerOverlay({
      overlay,
      target: { type: 'season', id: 2, title: 'Season 1' },
      listed: true,
      watchlisted: true,
    });
    expect(overlay.state('person', 1).listed).toBe(true);
    expect(overlay.state('season', 2).watchlisted).toBe(true);
    expect(overlay.watchlistCount()).toBe(1);
    syncPickerOverlay({
      overlay,
      target: { type: 'season', id: 2, title: 'Season 1' },
      listed: false,
      watchlisted: false,
    });
    expect(overlay.state('person', 1).listed).toBe(true);
    expect(overlay.state('season', 2).listed).toBe(false);
    expect(overlay.watchlistCount()).toBe(0);
  });
});
