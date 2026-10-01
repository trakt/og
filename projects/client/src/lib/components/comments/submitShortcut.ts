/** Cmd/Ctrl+Enter in a comment textarea submits its form . */
export function submitShortcut(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }): void {
  if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}
