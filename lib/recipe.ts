// Some TheMealDB recipes prefix each step with a "bullet" glyph on its own line
// (e.g. ▢ U+25A2, •, -, or "1."). Strip those so steps render cleanly.
const LEADING_MARKER =
  /^[\s•‣⁃∙■-◿☐-☒*–—-]+/u;

export function parseSteps(instructions: string | null | undefined): string[] {
  if (!instructions) return [];
  return instructions
    .split(/\r?\n+/)
    .map((line) =>
      line.replace(LEADING_MARKER, "").replace(/^\d+[.)]\s*/, "").trim(),
    )
    .filter((line) => line.length > 0 && !/^step\s*\d*$/i.test(line));
}
