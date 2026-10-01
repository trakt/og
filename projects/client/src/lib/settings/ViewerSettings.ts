import type { SettingsResponse } from '@trakt/api';

/** The unstripped settings response, including API fields missing from @trakt/api 0.6.0's contract. */
export type ViewerSettings = SettingsResponse & {
  readonly user: SettingsResponse['user'] & { readonly email?: string | null };
  /** Available with extended=sharing; channels contain boolean notification/sharing preferences. */
  readonly sharing?: Readonly<Record<string, Readonly<Record<string, boolean>>>> | null;
};
