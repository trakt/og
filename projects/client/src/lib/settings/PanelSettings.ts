import type { toPanelSettings } from './toPanelSettings.ts';

/** Mutable values bound by the General settings panels, in their API read shape. */
export type PanelSettings = ReturnType<typeof toPanelSettings>;
