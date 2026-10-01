import { loadCredits } from '../../../../lib/credits/loadCredits.ts';

export const load = ({ fetch, parent, params }) =>
  loadCredits({ fetch, parent, item: { type: 'show', id: params.id } });
