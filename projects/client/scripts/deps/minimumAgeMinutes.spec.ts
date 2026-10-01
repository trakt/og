import { describe, expect, it } from 'vitest';
import { minimumAgeMinutes } from './minimumAgeMinutes.ts';

describe('util: minimumAgeMinutes', () => {
  it('should read minutes as a number', () => {
    expect(minimumAgeMinutes({ minimumDependencyAge: 1440 })).toBe(1440);
  });

  it('should read minutes as a numeric string', () => {
    expect(minimumAgeMinutes({ minimumDependencyAge: '120' })).toBe(120);
  });

  it('should accept 0, which turns the rule off', () => {
    expect(minimumAgeMinutes({ minimumDependencyAge: 0 })).toBe(0);
  });

  it('should throw when the setting is missing, so the rule can never silently drop', () => {
    expect(() => minimumAgeMinutes({})).toThrow(/minimumDependencyAge/);
  });

  it('should throw on forms it does not read', () => {
    expect(() => minimumAgeMinutes({ minimumDependencyAge: 'P1D' })).toThrow();
    expect(() => minimumAgeMinutes({ minimumDependencyAge: '2025-09-16' })).toThrow();
    expect(() => minimumAgeMinutes({ minimumDependencyAge: -5 })).toThrow();
    expect(() => minimumAgeMinutes({ minimumDependencyAge: 1.5 })).toThrow();
  });
});
