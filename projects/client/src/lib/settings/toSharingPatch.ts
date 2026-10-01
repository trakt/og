import type { SharingDraft } from './SharingDraft.ts';

/** The Sharing tab's `PUT /users/settings` body: only the texts that changed. */
export type SharingBody = { readonly sharing_text: Readonly<Partial<SharingDraft>> };

const FIELDS = ['watching', 'watched', 'rated'] as const;

/** What the Sharing form has to send to turn `before` (the saved texts) into `after` (the form), or null for nothing. */
export function toSharingPatch({ before, after }: { before: SharingDraft; after: SharingDraft }): SharingBody | null {
  const changed = FIELDS.filter((field) => after[field] !== before[field]);
  if (!changed.length) return null;
  return { sharing_text: Object.fromEntries(changed.map((field) => [field, after[field]])) };
}
