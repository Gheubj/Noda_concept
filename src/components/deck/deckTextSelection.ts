/** Оборачивает выделение в textarea в `left` + selection + `right`, ставит курсор внутрь разметки. */
export function wrapTextareaSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  onCommit: (next: string) => void,
  left: string,
  right: string
): void {
  const { selectionStart: a0, selectionEnd: a1 } = textarea;
  const sel = value.slice(a0, a1);
  const next = value.slice(0, a0) + left + sel + right + value.slice(a1);
  onCommit(next);
  const posStart = a0 + left.length;
  const posEnd = posStart + sel.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(posStart, posEnd);
  });
}

export type DeckTextFormatApi = {
  wrapSelection: (left: string, right: string) => void;
};
