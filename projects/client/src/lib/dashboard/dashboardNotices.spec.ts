import { describe, expect, it } from 'vitest';
import { dashboardNotices } from './dashboardNotices.ts';

const notices = (joinedAt: string, now: string, isVip = false, listLimit: number | undefined = 11) =>
  dashboardNotices({ joinedAt, now: new Date(now), isVip, listLimit });

describe('dashboardNotices', () => {
  it('should welcome an account until exactly seven days after signup', () => {
    expect(notices('2026-09-23T23:30:00Z', '2026-09-30T23:29:59Z').welcome).toBe(true);
    expect(notices('2026-09-23T23:30:00Z', '2026-09-30T23:30:00Z').welcome).toBe(false);
    expect(notices('2026-10-01T00:00:00Z', '2026-09-30T00:00:00Z').welcome).toBe(false);
  });

  it('should mark the anniversary by UTC signup date and ordinal year', () => {
    expect(notices('2025-09-30T23:30:00Z', '2026-09-30T00:00:00Z').anniversary).toBe('1st');
    expect(notices('2024-09-30T23:30:00Z', '2026-09-30T00:00:00Z').anniversary).toBe('2nd');
    expect(notices('2023-09-30T23:30:00Z', '2026-09-30T00:00:00Z').anniversary).toBe('3rd');
    expect(notices('2015-09-30T23:30:00Z', '2026-09-30T00:00:00Z').anniversary).toBe('11th');
    expect(notices('2005-09-30T23:30:00Z', '2026-09-30T00:00:00Z').anniversary).toBe('21st');
    expect(notices('2026-09-30T00:00:00Z', '2026-09-30T12:00:00Z').anniversary).toBeNull();
    expect(notices('2025-09-30T00:00:00Z', '2026-10-01T00:00:00Z').anniversary).toBeNull();
  });

  it('should show only a known free-account list bonus, above the base limit of five', () => {
    expect(notices('2020-09-30T00:00:00Z', '2026-09-30T12:00:00Z').additionalLists).toBe(6);
    expect(notices('2020-09-30T00:00:00Z', '2026-09-30T12:00:00Z', true).additionalLists).toBeNull();
    expect(
      dashboardNotices({
        joinedAt: '2020-09-30T00:00:00Z',
        now: new Date('2026-09-30'),
        isVip: false,
        listLimit: undefined,
      }).additionalLists,
    ).toBeNull();
    expect(notices('2020-09-30T00:00:00Z', '2026-09-30T12:00:00Z', false, 3).additionalLists).toBe(0);
  });
});
