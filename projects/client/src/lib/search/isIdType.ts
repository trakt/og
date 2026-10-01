import type { SearchType } from './SearchType.ts';

export const isIdType = (type: SearchType) => 'idType' in type;
