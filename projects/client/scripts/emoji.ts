// Builds og's emoji shortname table from the JoyPixels data OG shipped (emoji-toolkit 6.6, MIT for the JSON).
// Usage: deno task emoji. Writes src/lib/components/comments/text/emojiShortnames.txt, one `name codepoints` per line.

// Skin-tone variants (`:thumbsup_tone3:`) are left out: the renderer adds the tone modifier to the base emoji itself,
// which keeps the table to about a third of JoyPixels' names.
type Entry = {
  shortname: string;
  shortname_alternates: string[];
  diversity: string | null;
  code_points: { fully_qualified: string };
};

const railsRoot = Deno.env.get('OG_ASSET_PATH') ?? './assets';
const source = `${railsRoot}/emoji.json`;
const target = 'src/lib/components/comments/text/emojiShortnames.txt';

const entries: Record<string, Entry> = JSON.parse(await Deno.readTextFile(source));
const name = (shortname: string) => shortname.replace(/^:|:$/g, '');

const lines = Object.values(entries)
  .filter((entry) => entry.diversity === null)
  .flatMap((entry) =>
    [entry.shortname, ...entry.shortname_alternates].map((shortname) =>
      `${name(shortname)} ${entry.code_points.fully_qualified}`
    )
  );

await Deno.writeTextFile(target, `${lines.join('\n')}\n`);
console.log(`Wrote ${lines.length} shortnames to ${target}`);
