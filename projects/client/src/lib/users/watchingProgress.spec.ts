import { describe, expect, it } from 'vitest';
import { watchingProgress } from './watchingProgress.ts';

const endsAt = '2026-09-29T21:00:00.000Z';
const at = (iso: string) => Date.parse(iso);

describe('watchingProgress', () => {
  it('should measure from runtime before the end', () => {
    expect(watchingProgress({ endsAt, runtime: 60, now: at('2026-09-29T20:15:00.000Z') })).toEqual({
      percent: 25,
      elapsed: '0:15',
      runtime: '1:00',
      done: false,
    });
  });

  it('should pad minutes and carry hours', () => {
    const progress = watchingProgress({ endsAt, runtime: 125, now: at('2026-09-29T20:59:00.000Z') });

    expect(progress.runtime).toBe('2:05');
    expect(progress.elapsed).toBe('2:04');
  });

  it('should stop at 100% and say it is done', () => {
    expect(watchingProgress({ endsAt, runtime: 42, now: at('2026-09-29T21:00:01.000Z') })).toMatchObject({
      percent: 100,
      elapsed: '0:42',
      done: true,
    });
  });

  it('should not go below 0 before the start', () => {
    expect(watchingProgress({ endsAt, runtime: 30, now: at('2026-09-29T20:00:00.000Z') }).percent).toBe(0);
  });
});
