import {
  compactPaletteText,
  findApproximateSubstring,
  prepareCompactPaletteQuery,
  type CompactPaletteQuery
} from './compact-query-match'
import { normalizePaletteText } from './normalized-text'

/** A search box's text, folded once per keystroke for filtering many rows. */
export type NameSearchQuery = {
  normalized: string
  words: readonly string[]
  compact: CompactPaletteQuery | null
}

/** Null for a blank query, which lists everything. */
export function prepareNameSearchQuery(query: string): NameSearchQuery | null {
  const normalized = normalizePaletteText(query).normalized.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return null
  }
  return {
    normalized,
    words: normalized.split(' '),
    compact: prepareCompactPaletteQuery(normalized)
  }
}

type FoldedField = { normalized: string; compact: string }

function foldFields(fields: readonly (string | null | undefined)[]): FoldedField[] {
  return fields.flatMap((field) => {
    if (!field) {
      return []
    }
    const normalized = normalizePaletteText(field).normalized
    return [{ normalized, compact: compactPaletteText(normalized).text }]
  })
}

function fieldHasWord(field: FoldedField, word: string): boolean {
  if (field.normalized.includes(word)) {
    return true
  }
  const compactWord = compactPaletteText(word).text
  return compactWord.length > 0 && field.compact.includes(compactWord)
}

/**
 * The palette's rules as a yes/no filter: every query word in some field, or the whole query
 * with spaces and `-_/.` ignored, or that within the palette's typo budget.
 */
export function nameSearchMatches(
  query: NameSearchQuery,
  fields: readonly (string | null | undefined)[]
): boolean {
  const folded = foldFields(fields)
  if (query.words.every((word) => folded.some((field) => fieldHasWord(field, word)))) {
    return true
  }
  const compact = query.compact
  if (!compact) {
    return false
  }
  if (folded.some((field) => field.compact.includes(compact.text))) {
    return true
  }
  return (
    compact.maxEdits > 0 &&
    folded.some(
      (field) => findApproximateSubstring(compact.text, field.compact, compact.maxEdits) !== null
    )
  )
}
