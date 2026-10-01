import type { ViewerRelation } from './ViewerRelation.ts';

type Entry = {
  readonly relation: ViewerRelation;
  readonly followerDelta: number;
  readonly decision: 'approve' | 'deny' | 'block' | null;
  readonly hideBlock: boolean;
};

/** Page-scoped relationship patches: header and cards share them, with no server singleton or persistent cache. */
export function createRelationshipOverlay() {
  let revision = 0;
  let entries = $state<Readonly<Record<string, Entry>>>({});
  let pending = $state<Readonly<Record<string, boolean>>>({});
  return {
    get revision() {
      return revision;
    },
    state(slug: string, relation: ViewerRelation): Entry {
      return entries[slug] ?? { relation, followerDelta: 0, decision: null, hideBlock: false };
    },
    busy(slug: string) {
      return pending[slug] === true;
    },
    start(slug: string) {
      pending = { ...pending, [slug]: true };
    },
    finish(slug: string) {
      pending = { ...pending, [slug]: false };
    },
    patch(slug: string, update: Entry) {
      const previous = entries[slug];
      entries = { ...entries, [slug]: update };
      return () => {
        entries = previous
          ? { ...entries, [slug]: previous }
          : Object.fromEntries(Object.entries(entries).filter(([key]) => key !== slug));
      };
    },
    clear() {
      revision++;
      entries = {};
      pending = {};
    },
  };
}
