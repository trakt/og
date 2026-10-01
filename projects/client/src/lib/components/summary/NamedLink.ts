/** A name in a summary's facts: a person or a studio, linked when there's somewhere to go. */
export interface NamedLink {
  readonly name: string;
  readonly href?: string;
  /** Shown after the name in parentheses, like a writer's "screenplay". */
  readonly note?: string;
}
