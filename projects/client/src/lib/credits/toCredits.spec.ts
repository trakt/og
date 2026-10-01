import { describe, expect, it } from 'vitest';
import { toCredits } from './toCredits.ts';

const person = (trakt: number, name: string) => ({ name, ids: { trakt, slug: name.toLowerCase().replace(/ /g, '-') } });
const walter = {
  person: person(1, 'Bryan Cranston'),
  character: 'Walter White',
  characters: ['Walter White', 'Heisenberg'],
  episode_count: 62,
  images: { headshot: ['media.trakt.tv/images/people/000/000/001/headshots/medium/a.jpg.webp'] },
};
const crewMember = (trakt: number, name: string, jobs: string[]) => ({
  person: person(trakt, name),
  character: '',
  characters: [],
  jobs,
  episode_count: 1,
});

describe('toCredits', () => {
  it('should keep the actor tabs in order and drop empty ones', () => {
    const { actors } = toCredits({
      actors: [{ label: 'Season Regulars', members: [walter] }, { label: 'Guest Stars', members: [] }],
      crew: null,
      episodeCounts: true,
    });

    expect(actors).toEqual([{
      id: 'season-regulars',
      label: 'Season Regulars',
      count: '1',
      people: [{
        id: 1,
        name: 'Bryan Cranston',
        href: '/people/bryan-cranston',
        image: expect.stringContaining('/headshots/'),
        role: 'Walter White, Heisenberg',
        episodes: '62 episodes',
      }],
    }]);
  });

  it('should leave the episode count out for movies and episodes', () => {
    const { actors } = toCredits({ actors: [{ label: 'Cast', members: [walter] }], crew: {}, episodeCounts: false });

    expect(actors.at(0)?.people.at(0)?.episodes).toBeUndefined();
  });

  it('should order crew like OG: created by, directing, writing, production, then the rest alphabetically', () => {
    const { crew } = toCredits({
      actors: [],
      crew: {
        sound: [crewMember(2, 'A', ['Sound Mixer'])],
        'costume & make-up': [crewMember(3, 'B', ['Makeup Artist', 'Hair'])],
        production: [crewMember(4, 'C', ['Producer'])],
        art: [crewMember(5, 'D', ['Art Direction'])],
        writing: [crewMember(6, 'E', ['Writer'])],
        'created by': [crewMember(7, 'Vince Gilligan', ['Creator'])],
        directing: [crewMember(8, 'F', ['Director'])],
        lighting: [],
      },
      episodeCounts: false,
    });

    expect(crew.map(({ label }) => label)).toEqual([
      'Created By',
      'Directing',
      'Writing',
      'Production',
      'Art',
      'Costume & Make Up',
      'Sound',
    ]);
    expect(crew.at(5)).toMatchObject({ id: 'costume-make-up', people: [{ role: 'Makeup Artist, Hair' }] });
  });
});
