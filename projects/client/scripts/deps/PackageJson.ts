// The parts of package.json the bump job reads and writes. Everything else passes through untouched.
export interface PackageJson {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly [field: string]: unknown;
}
