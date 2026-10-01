import type { Hold } from './Hold.ts';

// Packages the weekly bump must not move past a version. Keep each reason specific, and delete the hold as soon
// as it no longer applies.
export const dependencyHolds: Readonly<Record<string, Hold>> = {
  typescript: {
    below: '7.0.0',
    reason: 'svelte-check and typescript-eslint need TypeScript 6 until they support 7',
  },
};
