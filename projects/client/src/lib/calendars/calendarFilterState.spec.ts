import { describe, expect, it } from 'vitest';
import { calendarFilterState } from './calendarFilterState.ts';

describe('calendarFilterState', () => {
  it('should count an episode of a watchlisted show as watchlisted', () => {
    expect(calendarFilterState({ watchlisted: false }, { watchlisted: true }).watchlisted).toBe(true);
  });

  it('should keep the episode state when the show is not watchlisted', () => {
    expect(calendarFilterState({ watchlisted: false }, { watchlisted: false }).watchlisted).toBe(false);
    expect(calendarFilterState({}, { watchlisted: false }).watchlisted).toBeUndefined();
  });

  it('should leave movies as they are', () => {
    expect(calendarFilterState({ watchlisted: false, rating: 8 }, undefined)).toEqual({
      watchlisted: false,
      rating: 8,
    });
  });
});
