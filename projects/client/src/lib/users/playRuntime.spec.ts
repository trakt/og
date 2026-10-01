import { describe, expect, it } from 'vitest';
import { playRuntime } from './playRuntime.ts';

describe('util: playRuntime', () => {
  it("should use an episode's own runtime, then its show's, then 42 minutes", () => {
    expect(playRuntime({ episode: { runtime: 58 }, show: { runtime: 45 } })).toBe(58);
    expect(playRuntime({ episode: { runtime: null }, show: { runtime: 45 } })).toBe(45);
    expect(playRuntime({ episode: {}, show: { runtime: 0 } })).toBe(42);
  });

  it("should use a movie's runtime, or 90 minutes without one", () => {
    expect(playRuntime({ movie: { runtime: 118 } })).toBe(118);
    expect(playRuntime({ movie: { runtime: null } })).toBe(90);
    expect(playRuntime({ movie: { runtime: 0 } })).toBe(90);
  });
});
