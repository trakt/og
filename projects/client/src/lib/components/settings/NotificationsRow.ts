/** One notification of a `NotificationsTable`. */
export type NotificationsRow = {
  readonly id: string;
  /** Plain text: the row's label and each of its checkboxes' names. */
  readonly label: string;
  /** OG's gray italic line under the label. */
  readonly helper?: string;
};
