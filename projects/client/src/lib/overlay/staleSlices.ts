import type { LastActivitiesResponse } from '@trakt/api';
import type { SliceName } from './overlayStorage.ts';
import { sliceSources } from './sliceSources.ts';

/** Slices that are missing, or whose `last_activities` key moved since they were fetched. */
export function staleSlices(
  known: Readonly<Partial<Record<SliceName, string>>>,
  activities: LastActivitiesResponse,
): SliceName[] {
  const names = Object.keys(sliceSources) as SliceName[];
  return names.filter((name) => known[name] !== sliceSources[name].activity(activities));
}
