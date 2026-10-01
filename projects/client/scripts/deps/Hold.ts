// Keeps a package below a version until the reason goes away.
export interface Hold {
  readonly below: string;
  readonly reason: string;
}
