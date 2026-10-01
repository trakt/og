import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl } from './youtubeEmbedUrl.ts';

const EMBED = 'https://www.youtube.com/embed/dfeUzm6KF4g?autoplay=1';

describe('youtubeEmbedUrl', () => {
  it('should embed a watch URL', () => {
    expect(youtubeEmbedUrl('https://youtube.com/watch?v=dfeUzm6KF4g&t=4')).toBe(EMBED);
  });

  it('should embed a short URL', () => {
    expect(youtubeEmbedUrl('https://youtu.be/dfeUzm6KF4g')).toBe(EMBED);
  });

  it('should embed the links comments allow', () => {
    expect(youtubeEmbedUrl('http://www.youtube.com/watch?v=dfeUzm6KF4g')).toBe(EMBED);
    expect(youtubeEmbedUrl('https://m.youtube.com/watch?v=dfeUzm6KF4g')).toBe(EMBED);
    expect(youtubeEmbedUrl('https://www.youtube.com/shorts/dfeUzm6KF4g')).toBe(EMBED);
    expect(youtubeEmbedUrl('https://www.youtube.com/embed/dfeUzm6KF4g')).toBe(EMBED);
  });

  it('should leave anything else alone', () => {
    expect(youtubeEmbedUrl('https://vimeo.com/123')).toBeUndefined();
    expect(youtubeEmbedUrl('https://notyoutube.com/watch?v=dfeUzm6KF4g')).toBeUndefined();
    expect(youtubeEmbedUrl('https://www.youtube.com/results?search_query=credits')).toBeUndefined();
    expect(youtubeEmbedUrl('not a url')).toBeUndefined();
  });

  it('should refuse an id that could break out of the embed URL', () => {
    expect(youtubeEmbedUrl('https://youtube.com/watch?v=abc%22%3E%3Cscript%3E')).toBeUndefined();
    expect(youtubeEmbedUrl('https://youtu.be/../../evil')).toBeUndefined();
  });
});
