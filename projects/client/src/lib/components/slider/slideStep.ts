const STEPS: Readonly<Record<string, -1 | 1>> = { p: -1, ArrowLeft: -1, n: 1, ArrowRight: 1 };

/**
 * The slide a slider moves to: `step` is -1 for previous and 1 for next, or a key (OG's Mousetrap `p` or left, `n` or
 * right). It wraps around at both ends. `undefined` for any other key, or no slides, so the slider leaves the event
 * alone.
 */
export function slideStep(index: number, count: number, step: -1 | 1 | string): number | undefined {
  const delta = typeof step === 'number' ? step : STEPS[step];
  if (delta === undefined || count === 0) return undefined;

  return (index + delta + count) % count;
}
