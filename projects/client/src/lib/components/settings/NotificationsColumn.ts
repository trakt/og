/** One channel column of a `NotificationsTable`: its header icon and name. */
export type NotificationsColumn = {
  readonly id: string;
  /** The channel's name: the header's tooltip and part of each checkbox's name. */
  readonly title: string;
  /** The header icon, as raw SVG. */
  readonly icon: string;
  /** Shown but not editable, and its header doesn't toggle the column. */
  readonly readonly?: boolean;
};
