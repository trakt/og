/**
 * A slider scale like noUiSlider's `range` option: value stops at track percentages, linear between them, so a
 * slider can give the busy part of its range more room (OG's year slider spends half its track on 1880 to 1975).
 */
export type RangeScale = {
  /** Ascending `[percent, value]` pairs, from `[0, min]` to `[100, max]`. */
  readonly stops: readonly (readonly [number, number])[];
  /** The value step: 1 for years and minutes, 0.1 for IMDb. */
  readonly step: number;
};

export const scaleMin = (scale: RangeScale) => scale.stops.at(0)?.[1] ?? 0;
export const scaleMax = (scale: RangeScale) => scale.stops.at(-1)?.[1] ?? 0;

/** A linear scale from `min` to `max`. */
export const linearScale = (min: number, max: number, step = 1): RangeScale => ({
  stops: [[0, min], [100, max]],
  step,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Rounds to the step without float noise: 7.1, not 7.1000000001.
const round = (value: number, step: number) => {
  const decimals = `${step}`.split('.').at(1)?.length ?? 0;
  return Number((Math.round(value / step) * step).toFixed(decimals));
};

/** Where a value sits on the track, 0 to 100. */
export function toPercent(value: number, scale: RangeScale): number {
  const v = clamp(value, scaleMin(scale), scaleMax(scale));
  const index = scale.stops.findIndex(([, stop]) => stop >= v);
  const upper = scale.stops.at(Math.max(index, 1));
  const lower = scale.stops.at(Math.max(index, 1) - 1);
  if (!upper || !lower) return 0;

  const [p0, v0] = lower;
  const [p1, v1] = upper;
  return v1 === v0 ? p0 : p0 + ((v - v0) / (v1 - v0)) * (p1 - p0);
}

/** The value at a track position, rounded to the step. */
export function fromPercent(percent: number, scale: RangeScale): number {
  const p = clamp(percent, 0, 100);
  const index = scale.stops.findIndex(([stop]) => stop >= p);
  const upper = scale.stops.at(Math.max(index, 1));
  const lower = scale.stops.at(Math.max(index, 1) - 1);
  if (!upper || !lower) return scaleMin(scale);

  const [p0, v0] = lower;
  const [p1, v1] = upper;
  const value = p1 === p0 ? v0 : v0 + ((p - p0) / (p1 - p0)) * (v1 - v0);
  return clamp(round(value, scale.step), scaleMin(scale), scaleMax(scale));
}
