// The slice of an npm registry document (`GET <registry>/<name>`) the bump job reads.
export interface Packument {
  readonly 'dist-tags'?: Readonly<Record<string, string>>;
  readonly time?: Readonly<Record<string, string>>;
  readonly versions?: Readonly<Record<string, { readonly deprecated?: string }>>;
}
