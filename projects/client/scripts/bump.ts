// Dependency bump. Moves every exact pin in package.json to the newest release
// Deno allows, keeps the ones that pass `deno task ci`, and bisects out the ones that don't.
// Usage: deno task bump [--dry-run] [--out <dir>]
// --dry-run only print what each pin would move to; touches nothing.
// --out where to write title.txt, body.md and issues.json for review (default: a temp dir).
import { applyUpgrades } from './deps/applyUpgrades.ts';
import { bisectUpgrades } from './deps/bisectUpgrades.ts';
import type { BisectResult } from './deps/BisectResult.ts';
import type { BumpReport } from './deps/BumpReport.ts';
import { bumpTitle } from './deps/bumpTitle.ts';
import { dependencyHolds } from './deps/dependencyHolds.ts';
import type { HeldPackage } from './deps/HeldPackage.ts';
import { minimumAgeMinutes } from './deps/minimumAgeMinutes.ts';
import type { PackageJson } from './deps/PackageJson.ts';
import type { Packument } from './deps/Packument.ts';
import { parsePin } from './deps/parsePin.ts';
import type { Pin } from './deps/Pin.ts';
import { pickTargets } from './deps/pickTargets.ts';
import { pullRequestBody } from './deps/pullRequestBody.ts';
import { rejectedIssues } from './deps/rejectedIssues.ts';
import { syncAllowScripts } from './deps/syncAllowScripts.ts';
import type { Targets } from './deps/Targets.ts';
import type { Upgrade } from './deps/Upgrade.ts';

const FILES = ['package.json', 'deno.json', 'deno.lock'] as const;
type Snapshot = Readonly<Record<(typeof FILES)[number], string>>;

const LOG_TAIL_LINES = 60;

const dryRun = Deno.args.includes('--dry-run');
const outFlag = Deno.args.indexOf('--out');
const outArg = outFlag >= 0 ? Deno.args.at(outFlag + 1) : undefined;

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await Deno.readTextFile(path));
const writeJson = (path: string, value: unknown) => Deno.writeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);

// Same registries as .npmrc.
const registryUrl = (name: string) =>
  `${name.startsWith('@jsr/') ? 'https://npm.jsr.io' : 'https://registry.npmjs.org'}/${name.replace('/', '%2f')}`;

const fetchPackument = async (name: string): Promise<Packument> => {
  const response = await fetch(registryUrl(name), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${name}: registry answered ${response.status}`);
  return response.json();
};

const snapshot = async (): Promise<Snapshot> => {
  const [packageJson = '', denoJson = '', lock = ''] = await Promise.all(FILES.map((file) => Deno.readTextFile(file)));
  return { 'package.json': packageJson, 'deno.json': denoJson, 'deno.lock': lock };
};

const restore = (files: Snapshot) => Promise.all(FILES.map((file) => Deno.writeTextFile(file, files[file])));

// Collects stdout and stderr into one log in the order they arrive, so the tail of a failure shows the error
// rather than whichever stream happened to be appended last.
const run = async (command: ReadonlyArray<string>) => {
  const [program = '', ...rest] = command;
  const child = new Deno.Command(program, {
    args: rest,
    env: { NO_COLOR: '1' },
    stdout: 'piped',
    stderr: 'piped',
  }).spawn();
  const chunks: Array<string> = [`$ ${command.join(' ')}\n`];
  const collect = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    for await (const chunk of stream) chunks.push(decoder.decode(chunk, { stream: true }));
  };
  const [{ success }] = await Promise.all([child.status, collect(child.stdout), collect(child.stderr)]);
  return { success, log: chunks.join('') };
};

// Runs each step until one fails. The log covers every step that ran.
const runAll = (steps: ReadonlyArray<ReadonlyArray<string>>) =>
  steps.reduce<Promise<{ success: boolean; log: string }>>(async (previous, step) => {
    const done = await previous;
    if (!done.success) return done;
    const next = await run(step);
    return { success: next.success, log: `${done.log}${next.log}` };
  }, Promise.resolve({ success: true, log: '' }));

const tail = (log: string) => log.trimEnd().split('\n').slice(-LOG_TAIL_LINES).join('\n');

const describe = (set: ReadonlyArray<Upgrade>) => set.map(({ pin, to }) => `${pin.key}@${to}`).join(', ');

// Writes the set on top of the baseline, re-points allowScripts at the versions the lockfile now resolves, then runs
// what CI runs. A passing probe becomes the new baseline; a failing one is rolled back.
const makeProbe = (initial: Snapshot, logs: Record<string, string>) => {
  const state = { baseline: initial };

  const probe = async (set: ReadonlyArray<Upgrade>) => {
    console.log(`probe: ${describe(set)}`);
    await restore(state.baseline);
    await writeJson('package.json', applyUpgrades(JSON.parse(state.baseline['package.json']), set));

    const locked = await run(['deno', 'install', '--lockfile-only']);
    if (locked.success) {
      const denoJson = JSON.parse(state.baseline['deno.json']);
      const lock = await readJson<{ npm?: Record<string, unknown> }>('deno.lock');
      const synced = syncAllowScripts({
        allowScripts: denoJson.allowScripts ?? [],
        lockedPackages: Object.keys(lock.npm ?? {}),
      });
      await writeJson('deno.json', { ...denoJson, allowScripts: synced.allowScripts });
    }

    const verified = locked.success ? await runAll([['deno', 'install'], ['deno', 'task', 'ci']]) : locked;

    if (verified.success) {
      state.baseline = await snapshot();
      console.log('  passed');
      return true;
    }

    const [only] = set;
    if (only && set.length === 1) logs[`${only.pin.key}@${only.to}`] = tail(verified.log);
    await restore(state.baseline);
    console.log('  failed');
    return false;
  };

  return { probe, baseline: () => state.baseline };
};

const writeOutputs = async (report: BumpReport, out: string) => {
  const changed = report.minor.adopted.length + report.major.adopted.length > 0;
  await Deno.mkdir(out, { recursive: true });
  await Deno.writeTextFile(`${out}/title.txt`, `${bumpTitle(report)}\n`);
  await Deno.writeTextFile(`${out}/body.md`, pullRequestBody(report));
  await writeJson(`${out}/issues.json`, rejectedIssues(report));

  const githubOutput = Deno.env.get('GITHUB_OUTPUT');
  if (!githubOutput) return;
  await Deno.writeTextFile(
    githubOutput,
    [`changed=${changed}`, `majors=${report.major.adopted.length > 0}`, `title=${bumpTitle(report)}`, ''].join('\n'),
    { append: true },
  );
};

const packageJson = await readJson<PackageJson>('package.json');
const minimumAge = minimumAgeMinutes(await readJson('deno.json'));
const pins = Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies })
  .flatMap(([key, spec]) => {
    const pin = parsePin(key, spec);
    return pin ? [pin] : [];
  });

const now = new Date();
const targets: ReadonlyArray<{ pin: Pin; targets: Targets }> = await Promise.all(
  pins.map(async (pin) => ({
    pin,
    targets: pickTargets({
      current: pin.version,
      packument: await fetchPackument(pin.registryName),
      now,
      minimumAgeMinutes: minimumAge,
      hold: dependencyHolds[pin.key],
    }),
  })),
);

console.log(`Minimum release age: ${minimumAge} minutes (deno.json minimumDependencyAge)`);
console.table(
  Object.fromEntries(
    targets.map(({ pin, targets }) => [pin.key, {
      current: pin.version,
      minor: targets.minor ?? '',
      major: targets.major ?? '',
      held: targets.held ?? '',
    }]),
  ),
);

const held: ReadonlyArray<HeldPackage> = targets.flatMap(({ pin, targets }) => {
  const hold = dependencyHolds[pin.key];
  return targets.held && hold ? [{ key: pin.key, current: pin.version, held: targets.held, reason: hold.reason }] : [];
});
const minorCandidates: ReadonlyArray<Upgrade> = targets.flatMap(({ pin, targets }) =>
  targets.minor ? [{ pin, to: targets.minor }] : []
);

if (dryRun) Deno.exit(0);

const original = await snapshot();
const logs: Record<string, string> = {};
const { probe, baseline } = makeProbe(original, logs);

const minor: BisectResult = await bisectUpgrades({ candidates: minorCandidates, probe });

// Majors go on top of the adopted minors, measured from the version the minor pass left them on.
const adoptedMinor = new Map(minor.adopted.map(({ pin, to }) => [pin.key, to]));
const majorCandidates: ReadonlyArray<Upgrade> = targets.flatMap(({ pin, targets }) =>
  targets.major ? [{ pin: { ...pin, version: adoptedMinor.get(pin.key) ?? pin.version }, to: targets.major }] : []
);
const major: BisectResult = await bisectUpgrades({ candidates: majorCandidates, probe });

// Leave the adopted set on disk, whatever the last probe was.
await restore(baseline());
await run(['deno', 'install']);

const allowScripts = syncAllowScripts({
  allowScripts: JSON.parse(original['deno.json']).allowScripts ?? [],
  lockedPackages: Object.keys(JSON.parse(baseline()['deno.lock']).npm ?? {}),
}).moved;

const report: BumpReport = { minor, major, held, allowScripts, logs };
const out = outArg ?? await Deno.makeTempDir({ prefix: 'og-bump-' });
await writeOutputs(report, out);

console.log(`\n${pullRequestBody(report)}`);
console.log(`Wrote ${out}/title.txt, body.md and issues.json`);
