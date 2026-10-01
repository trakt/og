// CJK scripts don't space their words, so each character counts as one, like the server.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

/** The API's word count for the 5-word minimum. */
export function wordCount(text: string): number {
  return text.replace(CJK, ' $& ').match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}
