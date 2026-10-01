import type { AdvancedAction } from './runAdvancedAction.ts';

/** What the Advanced tab's buttons do. The demo route passes fakes that never reach the API or the overlay. */
export type AdvancedActions = {
  /** Resolves whether the API took it. */
  readonly run: (action: AdvancedAction) => Promise<boolean>;
  /** Refetches the overlay from scratch and reloads the layout's settings. */
  readonly resetBrowserData: () => Promise<void>;
  /** After the account is gone. */
  readonly signOut: () => Promise<void>;
};
