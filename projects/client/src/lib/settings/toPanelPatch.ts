import type { PanelSettings } from './PanelSettings.ts';
import type { SettingsBody } from './toSettingsPatch.ts';

type Tree = { readonly [key: string]: string | boolean | Tree };

function changed(before: Tree, after: Tree): Tree {
  return Object.fromEntries(
    Object.entries(after).flatMap<[string, string | boolean | Tree]>(([key, value]) => {
      const previous = before[key];
      if (typeof value !== 'object') return value === previous ? [] : [[key, value]];
      const nested = changed(typeof previous === 'object' ? previous : {}, value);
      return Object.keys(nested).length ? [[key, nested]] : [];
    }),
  );
}

/** Only changed leaves; profile reads under browsing but writes under user.profile. VIP writes are guarded here too. */
export function toPanelPatch({ before, after, vip, grandfathered }: {
  before: PanelSettings;
  after: PanelSettings;
  vip: boolean;
  grandfathered: boolean;
}): SettingsBody | null {
  const permitted = {
    ...after,
    yir: vip ? after.yir : before.yir,
    calendar: {
      ...after.calendar,
      autoscroll: vip ? after.calendar.autoscroll : false,
      image_type: grandfathered ? after.calendar.image_type : before.calendar.image_type,
    },
    progress: {
      ...after.progress,
      on_deck: { ...after.progress.on_deck, only_favorites: vip ? after.progress.on_deck.only_favorites : false },
    },
  };
  const { profile, ...browsing } = changed(before, permitted);
  const body = {
    ...(profile ? { user: { profile } } : {}),
    ...(Object.keys(browsing).length ? { browsing } : {}),
  };
  return Object.keys(body).length ? body : null;
}
