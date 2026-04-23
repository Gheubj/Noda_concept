const EMOJI_LIKE_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;

const SEGMENTER =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function graphemes(input: string): string[] {
  if (!input) {
    return [];
  }
  if (!SEGMENTER) {
    return Array.from(input);
  }
  return Array.from(SEGMENTER.segment(input), (x) => x.segment);
}

function toEmojiCode(emoji: string): string {
  return Array.from(emoji)
    .map((ch) => ch.codePointAt(0)?.toString(16) ?? "")
    .filter(Boolean)
    .join("-");
}

function looksLikeEmoji(segment: string): boolean {
  return EMOJI_LIKE_RE.test(segment);
}

/**
 * Replaces Unicode emoji symbols with markdown images from `/imgs/<code>.png`.
 * File names are expected in hex Unicode format (e.g. `1f44d-1f3fb.png`).
 */
export function markdownWithCustomEmojiImages(input: string): string {
  if (!input) {
    return input;
  }
  let out = "";
  for (const segment of graphemes(input)) {
    if (!looksLikeEmoji(segment)) {
      out += segment;
      continue;
    }
    const code = toEmojiCode(segment);
    out += `![${segment}](/imgs/${code}.png)`;
  }
  return out;
}
