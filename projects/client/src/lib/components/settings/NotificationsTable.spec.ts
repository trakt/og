import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import NotificationsTable from './NotificationsTable.svelte';

const markup = render(NotificationsTable, {
  props: {
    title: 'Comments',
    columns: [
      { id: 'email', title: 'Email', icon: '<svg viewBox="0 0 16 16"><path d="M0 0"/></svg>', readonly: true },
      { id: 'app', title: 'Trakt Apps', icon: '<svg viewBox="0 0 16 16"><path d="M0 0"/></svg>' },
    ],
    rows: [
      { id: 'reply', label: 'Someone replies to my comment' },
      { id: 'like', label: 'Someone likes my comment', helper: 'Only the first like.' },
    ],
    checked: (row: string, column: string) => row === 'reply' || column === 'email',
    onchange: () => {},
  },
}).body;

const checkboxes = [...markup.matchAll(/<input[^>]*>/g)].map(([tag]) => tag);

describe('NotificationsTable', () => {
  it('should name every checkbox by its row and channel', () => {
    expect(checkboxes.map((tag) => /aria-label="([^"]*)"/.exec(tag)?.[1])).toEqual([
      'Someone replies to my comment: Email',
      'Someone replies to my comment: Trakt Apps',
      'Someone likes my comment: Email',
      'Someone likes my comment: Trakt Apps',
    ]);
  });

  it('should show the values and disable only the read-only column', () => {
    expect(checkboxes.map((tag) => [tag.includes(' checked'), tag.includes(' disabled')])).toEqual([
      [true, true],
      [true, false],
      [true, true],
      [false, false],
    ]);
  });

  it('should give only the editable column a toggle button', () => {
    expect([...markup.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(([, name]) => name)).toEqual([
      'Check or uncheck every Trakt Apps notification in Comments',
    ]);
    expect(markup).toContain('Only the first like.');
  });
});
