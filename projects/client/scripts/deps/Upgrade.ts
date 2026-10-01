import type { Pin } from './Pin.ts';

// One pin moving to a new version.
export interface Upgrade {
  readonly pin: Pin;
  readonly to: string;
}
