import { listFilterOptions } from './listFilterOptions.ts';

type Option = ReturnType<typeof listFilterOptions>['hide'][number]['id'];
const parse = (
  value: string | undefined | null,
  allowed: readonly { id: Option }[],
) => [...new Set((value ?? '').split(',').filter((id): id is Option => allowed.some((option) => option.id === id)))];

/** An explicit URL (even empty) overrides the browser's preference for this kind of list. */
export function readListFilters({ search, cookies, scope, kind = 'personal', types = [], isSelf = false }: {
  search: URLSearchParams;
  cookies?: { get: (name: string) => string | undefined };
  scope: string;
  kind?: string;
  types?: readonly string[];
  isSelf?: boolean;
}) {
  const options = listFilterOptions({ kind, types, isSelf });
  return {
    fade: parse(search.get('fade') ?? cookies?.get(`filter-fade-${scope}`), options.fade),
    hide: parse(search.get('hide') ?? cookies?.get(`filter-hide-${scope}`), options.hide),
  };
}
