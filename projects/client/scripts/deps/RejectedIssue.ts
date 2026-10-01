// A follow-up issue for one bump the verify step rejected.
export interface RejectedIssue {
  // Open issues whose title starts with this belong to the same package, so a later run updates them.
  readonly titlePrefix: string;
  readonly title: string;
  readonly body: string;
}
