/**
 * What a tooltip's trigger is doing. It shows while it's hovered, focused or pinned open by a click, until Esc or a
 * click elsewhere dismisses it.
 */
export type TooltipState = Readonly<{
  hovered: boolean;
  focused: boolean;
  /** Clicked open, for a tooltip that toggles (touch never hovers). */
  pinned: boolean;
  dismissed: boolean;
  open: boolean;
}>;

export type TooltipEvent = 'enter' | 'leave' | 'focus' | 'blur' | 'dismiss' | 'toggle';

const changes: Record<Exclude<TooltipEvent, 'toggle'>, Partial<TooltipState>> = {
  // Pointing at or focusing the trigger again brings back a tooltip Esc dismissed.
  enter: { hovered: true, dismissed: false },
  leave: { hovered: false },
  focus: { focused: true, dismissed: false },
  blur: { focused: false },
  dismiss: { dismissed: true, pinned: false },
};

// Bootstrap's `toggle()`: a click shuts an open tooltip, even a hovered one, and pins a shut one open.
const toggled = (state: TooltipState): Partial<TooltipState> =>
  state.open ? { pinned: false, dismissed: true } : { pinned: true, dismissed: false };

/** Like Bootstrap's `hover focus` trigger: hover and focus count separately, so losing one keeps the other open. */
export function tooltipState(state: TooltipState, event: TooltipEvent): TooltipState {
  const change = event === 'toggle' ? toggled(state) : changes[event];
  const { hovered, focused, pinned, dismissed } = { ...state, ...change };
  return { hovered, focused, pinned, dismissed, open: !dismissed && (hovered || focused || pinned) };
}
