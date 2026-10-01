/** Shows, and seasons by show id, the viewer hid from one progress tab. */
export type HiddenProgress = {
  readonly shows: ReadonlySet<number>;
  readonly seasons: ReadonlyMap<number, ReadonlySet<number>>;
};
