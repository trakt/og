/** One featured list tile: the list it opens, its art, its two-line title and an optional green label. */
export type FeaturedList = {
  readonly id: number;
  readonly title: readonly [string, string];
  readonly background: string;
  readonly logo: string;
  readonly label?: string;
};

// The art OG kept in app/assets/images/lists/<site>/, copied as files.
const art: Record<string, string> = import.meta.glob('../assets/lists/*/*.{jpg,png}', {
  eager: true,
  import: 'default',
});

const tile = (id: number, site: string, title: [string, string], label?: string): FeaturedList => ({
  id,
  title,
  background: art[`../assets/lists/${site}/bg.jpg`] ?? '',
  logo: art[`../assets/lists/${site}/logo.png`] ?? '',
  ...(label && { label }),
});

/**
 * The Featured Lists tiles in OG's order. The ids and art were hardcoded there and
 * edited by hand, and they are here too. The named ids come
 */
export const featuredLists: readonly FeaturedList[] = [
  tile(30_484_958, 'academy-awards-2025', ['2025 Academy Awards', 'Nominees & Winners']),
  tile(30_156_306, 'golden-globes-2025', ['2025 Golden Globes', 'Nominees & Winners']),
  tile(27_074_303, 'rotten-tomatoes-tv-2024', ['Rotten Tomatoes', 'Best TV Shows of 2024']),
  tile(2_748_259, 'rolling-stone', ["Rolling Stone's", '100 Greatest TV Shows']),
  tile(2_142_753, 'imdb', ['IMDB', 'Top 250 Movies'], 'Updated Daily'),
  tile(6_544_049, 'reddit-2019', ['Reddit Top 250', '2019 Edition']),
  tile(2_143_363, 'imdb-tv', ['IMDB', 'Top 250 TV Shows'], 'Updated Daily'),
  tile(832_943, 'academy-awards', ['Academy Awards', 'Best Picture Winners']),
  tile(2_233_867, 'star-wars', ['Star Wars', 'Timeline']),
  tile(967_660, 'star-trek', ['Star Trek', 'Timeline']),
  tile(1_248_149, 'marvel', ['MARVEL', 'Cinematic Universe']),
  tile(1_257_909, 'dc', ['DC', 'Extended Universe']),
  tile(1_463_475, 'arrowverse', ['Arrowverse', 'Timeline']),
  tile(1_553_339, 'battlestar-galactica', ['Battlestar Galactica', 'Timeline']),
  tile(1_402_475, 'x-files', ['The Essential', 'X-Files']),
  tile(1_406_012, 'disney', ['Disney Animated', 'Feature Films']),
];
