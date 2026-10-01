import type { PeopleResponse } from '@trakt/api';
import { countLabel } from '../../utils/countLabel.ts';
import { imageUrl } from '../../utils/imageUrl.ts';
import type { CastMember } from './CastMember.ts';

/** Cast headshots, names and optional episode counts for show, season and episode summaries. */
export function toCastMembers(members: PeopleResponse['cast'] | undefined, actorSpoilers: boolean): CastMember[] {
  return (members ?? []).map((member) => ({
    name: member.person.name,
    href: `/people/${member.person.ids.slug}`,
    characters: (member.characters ?? []).join(', '),
    image: imageUrl(member.images?.headshot?.at(0), 'thumb'),
    episodes: actorSpoilers && member.episode_count ? countLabel(member.episode_count, 'episode') : '',
  }));
}
