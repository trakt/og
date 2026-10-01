import { describe, expect, it } from 'vitest';
import { relativeDate } from './relativeDate.ts';

const NOW = new Date('2026-09-29T12:00:00Z');
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);
const ahead = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

describe('relativeDate', () => {
  it("should match moment's fromNow for past dates", () => {
    expect(relativeDate(ago(10), NOW)).toBe('a few seconds ago');
    expect(relativeDate(ago(60), NOW)).toBe('a minute ago');
    expect(relativeDate(ago(5 * 60), NOW)).toBe('5 minutes ago');
    expect(relativeDate(ago(60 * 60), NOW)).toBe('an hour ago');
    expect(relativeDate(ago(3 * 3600), NOW)).toBe('3 hours ago');
    expect(relativeDate(ago(24 * 3600), NOW)).toBe('a day ago');
    expect(relativeDate(ago(3 * 86400), NOW)).toBe('3 days ago');
    expect(relativeDate(ago(30 * 86400), NOW)).toBe('a month ago');
    expect(relativeDate(ago(90 * 86400), NOW)).toBe('3 months ago');
    expect(relativeDate(ago(400 * 86400), NOW)).toBe('a year ago');
    expect(relativeDate(ago(3 * 365 * 86400), NOW)).toBe('3 years ago');
  });

  it('should phrase future dates', () => {
    expect(relativeDate(ahead(10), NOW)).toBe('in a few seconds');
    expect(relativeDate(ahead(3600), NOW)).toBe('in an hour');
    expect(relativeDate(ahead(2 * 86400), NOW)).toBe('in 2 days');
  });

  it('should accept an ISO string', () => {
    expect(relativeDate('2026-09-29T09:00:00Z', NOW)).toBe('3 hours ago');
  });
});
