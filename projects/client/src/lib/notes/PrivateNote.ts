/** The viewer's own note on an item. */
export type PrivateNote = {
  readonly id: number;
  readonly text: string;
  readonly updatedAt: string | null;
};
