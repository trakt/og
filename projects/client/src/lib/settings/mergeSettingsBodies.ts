import type { SettingsBody } from './toSettingsPatch.ts';

/** Combines independent General panels without dropping changed account fields or sending empty sections. */
export function mergeSettingsBodies(first: SettingsBody | null, second: SettingsBody | null): SettingsBody | null {
  const body = (['user', 'account', 'browsing'] as const).reduce<SettingsBody>((result, section) => {
    if (!first?.[section] && !second?.[section]) return result;
    return { ...result, [section]: { ...first?.[section], ...second?.[section] } };
  }, {});
  return Object.keys(body).length ? body : null;
}
