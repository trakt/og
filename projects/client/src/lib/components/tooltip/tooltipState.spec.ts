import { describe, expect, it } from 'vitest';
import { type TooltipEvent, type TooltipState, tooltipState } from './tooltipState.ts';

const closed: TooltipState = { hovered: false, focused: false, pinned: false, dismissed: false, open: false };
const after = (...events: TooltipEvent[]) => events.reduce(tooltipState, closed);

describe('tooltipState', () => {
  it('should open on hover and close when the pointer leaves', () => {
    expect(after('enter').open).toBe(true);
    expect(after('enter', 'leave').open).toBe(false);
  });

  it('should open on focus and close on blur', () => {
    expect(after('focus').open).toBe(true);
    expect(after('focus', 'blur').open).toBe(false);
  });

  it('should stay open while either hover or focus is left', () => {
    expect(after('focus', 'enter', 'leave').open).toBe(true);
    expect(after('enter', 'focus', 'blur').open).toBe(true);
  });

  it('should close on dismiss while still hovered and focused', () => {
    expect(after('enter', 'focus', 'dismiss')).toEqual({
      hovered: true,
      focused: true,
      pinned: false,
      dismissed: true,
      open: false,
    });
  });

  it('should reopen a dismissed tooltip on the next hover or focus', () => {
    expect(after('enter', 'dismiss', 'leave', 'enter').open).toBe(true);
    expect(after('focus', 'dismiss', 'blur', 'focus').open).toBe(true);
  });

  it('should not open on dismiss alone', () => {
    expect(after('dismiss').open).toBe(false);
  });

  it('should pin open on a click and stay open when the pointer leaves', () => {
    expect(after('toggle').open).toBe(true);
    expect(after('enter', 'leave', 'toggle', 'leave').open).toBe(true);
  });

  it('should shut on a second click, even while hovered', () => {
    expect(after('toggle', 'toggle').open).toBe(false);
    expect(after('enter', 'toggle').open).toBe(false);
  });

  it('should unpin on dismiss', () => {
    expect(after('toggle', 'dismiss', 'enter', 'leave').open).toBe(false);
  });
});
