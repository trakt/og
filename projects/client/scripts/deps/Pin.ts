// One exact pin from package.json. The written spec is always `prefix + version`.
export interface Pin {
  // The package.json key, e.g. `@trakt/api`.
  readonly key: string;
  // The name on the registry, e.g. `@jsr/trakt__api` for an `npm:` alias.
  readonly registryName: string;
  readonly version: string;
  // `''` for a plain pin, `npm:@jsr/trakt__api@` for an alias.
  readonly prefix: string;
}
