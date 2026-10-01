import type { ReportTarget } from './ReportTarget.ts';
import { reportReasons } from './reportReasons.ts';

/** OG allows a blank message only for Not English, and on comments for Too Short too. */
export function validateReport(
  { type, reason, message }: { type: ReportTarget['type']; reason: string; message: string },
) {
  return {
    reason: !reportReasons(type).some((option) => option.value === reason),
    message: reason !== 'language' && !(type === 'comment' && reason === 'too_short') && message.trim().length === 0,
  };
}
