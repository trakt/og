const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });

const displayName = (names: Intl.DisplayNames, code: string) => {
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
};

/** "us" → "United States". */
export const countryName = (code: string) => displayName(regionNames, code.toUpperCase());
/** "en" → "English". */
export const languageName = (code: string) => displayName(languageNames, code);

/** API's title case on API slugs: "science-fiction" → "Science Fiction", "returning series" → "Returning Series". */
export const titleize = (text: string) =>
  text.replace(/(^|[\s-])(\w)/g, (_, gap: string, c: string) => `${gap === '-' ? ' ' : gap}${c.toUpperCase()}`);
