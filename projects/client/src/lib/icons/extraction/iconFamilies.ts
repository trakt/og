const FA_VARIABLES = 'stylesheets/fontawesome/variables.scss';
const ICON_FONTS = 'stylesheets/icon-fonts.scss';

// Where each family's glyphs and names live, relative to the local asset directory.
// `lookup` says how to find a name's codepoint in `stylesheet`.
export const iconFamilies = {
  solid: { font: 'fonts/fa-solid-900.ttf', stylesheet: FA_VARIABLES, lookup: 'fa' },
  regular: { font: 'fonts/fa-regular-400.ttf', stylesheet: FA_VARIABLES, lookup: 'fa' },
  light: { font: 'fonts/fa-light-300.ttf', stylesheet: FA_VARIABLES, lookup: 'fa' },
  thin: { font: 'fonts/fa-thin-100.ttf', stylesheet: FA_VARIABLES, lookup: 'fa' },
  brands: { font: 'fonts/fa-brands-400.ttf', stylesheet: FA_VARIABLES, lookup: 'fa' },
  kit: { font: 'fonts/custom-icons.ttf', stylesheet: FA_VARIABLES, lookup: 'kit' },
  trakt: { font: 'fonts/trakt.ttf', stylesheet: ICON_FONTS, lookup: 'trakt' },
  logos: { font: 'fonts/logos.ttf', stylesheet: ICON_FONTS, lookup: 'logos' },
} as const;
