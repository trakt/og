interface Point {
  readonly x: number;
  readonly y: number;
}

/** A deliberate horizontal swipe navigates the media hierarchy; vertical scrolling stays untouched. */
export function swipeDirection({ start, end }: { start: Point; end: Point }): 'previous' | 'next' | null {
  const x = end.x - start.x;
  const y = end.y - start.y;
  if (Math.abs(x) < 75 || Math.abs(x) <= Math.abs(y) * 2) return null;
  return x < 0 ? 'next' : 'previous';
}
