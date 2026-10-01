// The page's new-comment form. The "Add comment" links open it wherever they sit, and the comment
// lists read what it posted. Browser only: the form mounts it in an effect, and this module is shared by every request
// on the server.
import type { CommentResponse } from '@trakt/api';

let mounted = $state(false);
let visible = $state(false);
let opened = $state(0);
let posted = $state<readonly CommentResponse[]>([]);

export const newComment = {
  /** A form is on the page: the viewer can comment here. */
  get available() {
    return mounted;
  },
  get visible() {
    return visible;
  },
  /** Counts the "Add comment" clicks, so the form scrolls and focuses on each one. */
  get opened() {
    return opened;
  },
  /** Newest first, to show above the loaded comments. */
  get posted() {
    return posted;
  },
  open() {
    visible = true;
    opened++;
  },
  add(comment: CommentResponse) {
    posted = [comment, ...posted];
  },
  close() {
    visible = false;
  },
  /** Call from the form's effect; the cleanup forgets the page's state. */
  mount() {
    mounted = true;
    return () => {
      mounted = false;
      visible = false;
      posted = [];
    };
  },
};
