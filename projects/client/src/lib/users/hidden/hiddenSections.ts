/** OG route names differ from the hidden API's section names. */
export const hiddenSections = {
  dropped: {
    label: 'Dropped',
    section: 'dropped',
    shows: true,
    description: "All shows you've stopped watching.",
    hint: 'Click any poster to undrop a show and place it back into a normal watching state.',
  },
  watched: {
    label: 'Watched Progress',
    section: 'progress_watched',
    shows: true,
    description: "All shows and seasons you've hidden from your up next & watched progress.",
    hint: 'Click any poster to unhide and restore the item to your up next & watched progress.',
  },
  collected: {
    label: 'Library Progress',
    section: 'progress_collected',
    shows: true,
    description: "All shows and seasons you've hidden from your library progress.",
    hint: 'Click any poster to unhide and restore the item to your library progress.',
  },
  rewatching: {
    label: 'Rewatching',
    section: 'progress_watched_reset',
    shows: true,
    description: "All shows you're rewatching.",
    hint: 'Click any poster to undo the rewatching state for a show.',
  },
  calendars: {
    label: 'Calendars',
    section: 'calendar',
    shows: false,
    description: "All shows and movies you've hidden from your calendars.",
    hint: 'Click any poster to unhide and restore the item to your calendars.',
  },
  comments: {
    label: 'Comments',
    section: 'comments',
    shows: false,
    description: "All comment authors you've blocked.",
    hint: 'Click any avatar to unblock the author.',
  },
} as const;
