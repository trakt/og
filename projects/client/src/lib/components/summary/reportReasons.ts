import type { ReportTarget } from './ReportTarget.ts';

const reasons = [
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'remove', label: 'Data Removal' },
  { value: 'data_refresh', label: 'Data Refresh' },
  { value: 'metadata', label: 'Invalid Metadata' },
  { value: 'adult', label: 'Adult' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'language', label: 'Not English' },
  { value: 'spam', label: 'Spam' },
  { value: 'tmdb', label: 'TMDB Migration' },
  { value: 'other', label: 'Other' },
] as const;

// in OG's order.
const commentReasons = [
  { value: 'spoilers', label: 'Spoilers' },
  { value: 'language', label: 'Not English' },
  { value: 'abusive', label: 'Abusive' },
  { value: 'spam', label: 'Spam' },
  { value: 'bigotry', label: 'Bigotry' },
  { value: 'political', label: 'Political Attack' },
  { value: 'offtopic', label: 'Off Topic' },
  { value: 'support', label: 'Support Question' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'too_short', label: 'Too Short' },
  { value: 'other', label: 'Other' },
] as const;

/** API accepts fewer reasons for people and users, and its own list for comments. */
export function reportReasons(type: ReportTarget['type']): ReadonlyArray<{ value: string; label: string }> {
  if (type === 'comment') return commentReasons;
  if (type === 'user') return reasons.filter(({ value }) => ['spam', 'adult', 'language', 'other'].includes(value));
  return reasons.filter(({ value }) => type !== 'person' || value !== 'runtime');
}
