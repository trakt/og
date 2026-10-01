/** One line of a progress tooltip: "203 plays" with its "3d 2h 56m" in italics, the remaining line dimmed. */
export type ProgressTooltipLine = {
  readonly text: string;
  readonly detail?: string;
  readonly muted?: boolean;
};
