/** OG's certification tips, one line per `<br>`. */
const TIPS: Readonly<Record<string, string>> = {
  g: 'All Ages',
  pg: 'Parental Guidance Suggested',
  'pg-13': 'Parents Strongly Cautioned\nAges 13+ Recommended',
  r: 'Mature Audiences\nAges 17+ Recommended',
  'nc-17': 'Mature Audiences\n18+ Only',
  'tv-y': 'All Children',
  'tv-y7': 'Older Children\nAges 7+ Recommended',
  'tv-g': 'All Ages',
  'tv-pg': 'Parental Guidance Suggested',
  'tv-14': 'Parents Strongly Cautioned\nAges 14+ Recommended',
  'tv-ma': 'Mature Audiences\nAges 17+ Recommended',
  nr: 'Not Rated',
};

/** The tooltip for a US certification pill, or undefined for one OG had no tip for. */
export function certificationTip(certification: string): string | undefined {
  return TIPS[certification.toLowerCase()];
}
