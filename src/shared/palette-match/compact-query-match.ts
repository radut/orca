import { mapNormalizedRange } from './normalized-text'
import { paletteProfileAllowedQualities, type PaletteIndexedField } from './indexed-field'
import { resolvePaletteResultQualityClass } from './match-quality'
import {
  createPaletteFallbackRank,
  type PaletteDocument,
  type PaletteDocumentMatch,
  type PaletteTokenAssignment
} from './palette-document'
import { buildRangesByField } from './palette-match-rendering'

const SEPARATOR = /[\s\-_/.]/
const DIGIT = /\p{N}/u
const COMPACT_QUERY_MIN_LENGTH = 4

type CompactText = { text: string; offsets: readonly number[] }

type ApproximateSpan = { start: number; end: number; distance: number }

/** Drops spaces and `-_/.` so word splits and separators never decide a match. */
function compactPaletteText(normalized: string): CompactText {
  let text = ''
  const offsets: number[] = []
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]
    if (!SEPARATOR.test(character)) {
      text += character
      offsets.push(index)
    }
  }
  return { text, offsets }
}

/** Edits allowed for a compact query: none under 4 chars, 1 up to 7, 2 from 8. */
function compactQueryTypoBudget(length: number): number {
  if (length < COMPACT_QUERY_MIN_LENGTH) {
    return 0
  }
  return length < 8 ? 1 : 2
}

// Reused across calls: allocating DP rows per field dominated the cost at 500 workspaces.
let scratch = new Int32Array(256)

/** Sellers' approximate substring DP: O(pattern·text), exits once every row cell exceeds the budget. */
function findApproximateSubstring(
  pattern: string,
  text: string,
  maxEdits: number
): ApproximateSpan | null {
  const m = pattern.length
  const n = text.length
  if (m === 0 || n < m - maxEdits) {
    return null
  }
  const width = n + 1
  if (scratch.length < width * 4) {
    scratch = new Int32Array(width * 8)
  }
  // Rows: cost (previous, current) then match start (previous, current), swapped by offset.
  let previous = 0
  let current = width
  let previousStart = width * 2
  let currentStart = width * 3
  for (let j = 0; j <= n; j += 1) {
    scratch[previous + j] = 0
    scratch[previousStart + j] = j
  }
  for (let i = 1; i <= m; i += 1) {
    scratch[current] = i
    scratch[currentStart] = 0
    let rowMinimum = i
    const character = pattern[i - 1]
    for (let j = 1; j <= n; j += 1) {
      const substitute = scratch[previous + j - 1] + (character === text[j - 1] ? 0 : 1)
      const skipPattern = scratch[previous + j] + 1
      const skipText = scratch[current + j - 1] + 1
      let cost = substitute
      let start = scratch[previousStart + j - 1]
      if (skipPattern < cost) {
        cost = skipPattern
        start = scratch[previousStart + j]
      }
      if (skipText < cost) {
        cost = skipText
        start = scratch[currentStart + j - 1]
      }
      scratch[current + j] = cost
      scratch[currentStart + j] = start
      if (cost < rowMinimum) {
        rowMinimum = cost
      }
    }
    if (rowMinimum > maxEdits) {
      return null
    }
    ;[previous, current] = [current, previous]
    ;[previousStart, currentStart] = [currentStart, previousStart]
  }
  let best: ApproximateSpan | null = null
  for (let j = 1; j <= n; j += 1) {
    const cost = scratch[previous + j]
    if (cost <= maxEdits && (!best || cost < best.distance)) {
      best = { start: scratch[previousStart + j], end: j, distance: cost }
    }
  }
  return best
}

function coverage(field: PaletteIndexedField): number {
  return field.role === 'primary' ? 0 : 1
}

function toMatch(
  field: PaletteIndexedField,
  compact: CompactText,
  span: ApproximateSpan
): PaletteDocumentMatch {
  const quality = span.distance === 0 ? 'compact' : 'typo'
  const start = compact.offsets[span.start]
  const end = compact.offsets[span.end - 1] + 1
  const assignment: PaletteTokenAssignment = {
    tokenIndex: 0,
    fieldId: field.id,
    quality,
    ranges: [mapNormalizedRange(field.text, start, end)]
  }
  return {
    qualityClass: resolvePaletteResultQualityClass({
      worstQuality: quality,
      usesSupportingEvidence: false
    }),
    rank: {
      ...createPaletteFallbackRank(),
      // 1 separator-blind equality, 2 edit-distance recovery: keeps normalized ahead of fuzzy.
      recovery: span.distance === 0 ? 1 : 2,
      wordMatch: 1,
      coverage: coverage(field),
      recoveryTokenCount: 1,
      strength: span.distance === 0 ? 4 : 5,
      placement: span.start === 0 ? 0 : 2
    },
    assignments: [assignment],
    rangesByField: buildRangesByField([assignment]),
    supportingEvidence: []
  }
}

const compactByField = new WeakMap<PaletteIndexedField, CompactText>()

// Documents are memoized across keystrokes, so each field is compacted once.
function compactField(field: PaletteIndexedField): CompactText {
  let compact = compactByField.get(field)
  if (!compact) {
    compact = compactPaletteText(field.text.normalized)
    compactByField.set(field, compact)
  }
  return compact
}

export type CompactPaletteQuery = { text: string; maxEdits: number }

/** Null when the compact query is too short to search across separators. */
export function prepareCompactPaletteQuery(normalizedQuery: string): CompactPaletteQuery | null {
  const text = compactPaletteText(normalizedQuery).text
  if (text.length < COMPACT_QUERY_MIN_LENGTH) {
    return null
  }
  // Digits are identifiers (PR numbers, ports), where a one-off edit names a different thing.
  return { text, maxEdits: DIGIT.test(text) ? 0 : compactQueryTypoBudget(text.length) }
}

function searchableFields(
  document: PaletteDocument,
  quality: 'compact' | 'typo'
): PaletteIndexedField[] {
  return document.visibleFields.filter(
    (field) =>
      field.role !== 'container' &&
      !field.identifier &&
      paletteProfileAllowedQualities(field.profile).includes(quality)
  )
}

/**
 * Whole-query fallback for documents the per-token matcher rejected, e.g.
 * `home labcluster` -> "HomeLab Cluster"; ranks after every token match.
 */
export function matchPaletteDocumentCompactQuery(
  document: PaletteDocument,
  query: CompactPaletteQuery
): PaletteDocumentMatch | null {
  for (const field of searchableFields(document, 'compact')) {
    const compact = compactField(field)
    const index = compact.text.indexOf(query.text)
    if (index !== -1) {
      return toMatch(field, compact, { start: index, end: index + query.text.length, distance: 0 })
    }
  }
  return null
}

/** Bounded edit-distance variant of the compact fallback; ranks after it. */
export function matchPaletteDocumentTypoQuery(
  document: PaletteDocument,
  query: CompactPaletteQuery
): PaletteDocumentMatch | null {
  if (query.maxEdits === 0) {
    return null
  }
  let best: { field: PaletteIndexedField; compact: CompactText; span: ApproximateSpan } | null =
    null
  for (const field of searchableFields(document, 'typo')) {
    const compact = compactField(field)
    const span = findApproximateSubstring(query.text, compact.text, query.maxEdits)
    if (span && (!best || span.distance < best.span.distance)) {
      best = { field, compact, span }
    }
  }
  return best ? toMatch(best.field, best.compact, best.span) : null
}
