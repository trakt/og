import type { HistoryPlay } from '../../components/history/HistoryPlay.ts';
import type { HistoryCard, HistoryDay } from './toHistoryCard.ts';

/** One concrete play, or every occurrence of this media item on the current page. */
export function removeHistoryCards({ days, item, play }: {
  days: readonly HistoryDay[];
  item: Pick<HistoryCard, 'type' | 'id'>;
  play?: HistoryPlay;
}): HistoryDay[] {
  return days.map((day) => {
    const cards = day.cards.filter((card) =>
      play ? card.key !== play.id : card.type !== item.type || card.id !== item.id
    );
    return { ...day, cards, runtime: cards.reduce((sum, card) => sum + card.runtime, 0) };
  }).filter((day) => day.cards.length > 0);
}
