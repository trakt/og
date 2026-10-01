// Members blocked from a comment card since the page loaded. The layout's settings don't reload after a block,
// so the cards read these too. Browser only: blocking is the only writer, and this module is shared by every request
// on the server.
import { SvelteSet } from 'svelte/reactivity';

export const blockedMembers = new SvelteSet<number>();
