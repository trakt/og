import type { PeopleResponse } from '@trakt/api';
import type { NamedLink } from './NamedLink.ts';

/** Directors and writers shared by movie and episode facts, retaining non-writer job notes. */
export function toCrewNames(people: Pick<PeopleResponse, 'crew'> | null) {
  const person = (member: { person: { name: string; ids: { slug: string } } }) => ({
    name: member.person.name,
    href: `/people/${member.person.ids.slug}`,
  });
  const directors: NamedLink[] = (people?.crew?.directing ?? [])
    .filter(({ jobs }) => jobs.includes('Director')).map(person);
  const writers: NamedLink[] = (people?.crew?.writing ?? []).map((member) => {
    const note = member.jobs.filter((job) => job.toLowerCase() !== 'writer').join(', ').toLowerCase();
    return { ...person(member), note: note || undefined };
  });
  return { directors, writers };
}
