export function stripComments(source: string): string {
  return source
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n');
}

export interface Trailer {
  key: string;
  value: string;
  lineNumber: number; // 1-based, in original message
}

const TRAILER_RE = /^([A-Za-z][A-Za-z0-9-]*):\s+(.+)$/;

export function extractTrailers(message: string): Trailer[] {
  // Keep original line indices so we can report line numbers after filtering comments.
  const originalLines = message.split('\n');
  const kept = originalLines
    .map((line, idx) => ({ line, originalIndex: idx }))
    .filter(({ line }) => !line.startsWith('#'));

  // Trim trailing empty lines.
  while (kept.length > 0 && kept[kept.length - 1]!.line.trim() === '') {
    kept.pop();
  }

  // Need at least two paragraphs (subject + trailer block) for trailers to exist.
  let hasBlank = false;
  for (const k of kept) {
    if (k.line === '') {
      hasBlank = true;
      break;
    }
  }
  if (!hasBlank) return [];

  // Find start of the last paragraph: walk backward until a blank line.
  let startIdx = kept.length - 1;
  while (startIdx > 0 && kept[startIdx - 1]!.line !== '') {
    startIdx--;
  }
  const lastParagraph = kept.slice(startIdx);

  // Every line in the last paragraph must be a trailer.
  for (const p of lastParagraph) {
    if (!TRAILER_RE.test(p.line)) return [];
  }

  const result: Trailer[] = [];
  for (const p of lastParagraph) {
    const m = p.line.match(TRAILER_RE);
    if (!m) continue;
    result.push({
      key: m[1]!,
      value: m[2]!,
      lineNumber: p.originalIndex + 1,
    });
  }
  return result;
}
