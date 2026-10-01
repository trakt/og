// Extracts one OG icon from the fonts in into src/lib/icons/<family>/<name>.svg.
// Usage: deno task icon <family> <name>, e.g. `deno task icon thin gear` for OG's `fa-thin fa-gear`.
import { extractIcon } from '../src/lib/icons/extraction/extractIcon.ts';
import { iconFamilies } from '../src/lib/icons/extraction/iconFamilies.ts';
import { isIconFamily } from '../src/lib/icons/extraction/isIconFamily.ts';

const USAGE = `Usage: deno task icon <family> <name>\nFamilies: ${Object.keys(iconFamilies).join(', ')}`;

const [family = '', name = ''] = Deno.args;
if (!isIconFamily(family) || !name) {
  console.error(USAGE);
  Deno.exit(1);
}

const railsRoot = Deno.env.get('OG_ASSET_PATH') ?? './assets';

const readFromRails = async <T>(path: string, read: (fullPath: string) => Promise<T>) => {
  try {
    return await read(`${railsRoot}/${path}`);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    console.error(`Can't find ${railsRoot}/${path}. Point OG_ASSET_PATH at a local asset directory.`);
    Deno.exit(1);
  }
};

try {
  const icon = await extractIcon({
    family,
    name,
    readText: (path) => readFromRails(path, Deno.readTextFile),
    readBytes: (path) => readFromRails(path, async (fullPath) => (await Deno.readFile(fullPath)).slice().buffer),
  });

  const dir = `src/lib/icons/${family}`;
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(`${dir}/${icon.name}.svg`, icon.svg);

  const alias = icon.name === name ? '' : ` ("${name}" is an alias of "${icon.name}")`;
  console.log(`Wrote ${dir}/${icon.name}.svg${alias}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  Deno.exit(1);
}
