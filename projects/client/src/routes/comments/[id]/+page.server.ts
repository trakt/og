import { loadComment } from '../../../lib/comments/loadComment.ts';

export const load = ({ fetch, parent, params }) => loadComment({ fetch, parent, id: params.id });
