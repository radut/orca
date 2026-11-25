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
import type { PaletteWord } from './text-segments'

const SEPARATOR = /[\s\-_/.]/
const DIGIT = /\p{N}/u
const COMPACT_QUERY_MIN_LENGTH = 4

type CompactText = { text: string; offsets: readonly number[] }

type ApproximateSpan = { start: number; end: number; distance: number }

type TextSpan = { start: number; end: number }

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

function compactSpanToText(compact: CompactText, span: ApproximateSpan): TextSpan {
  return { start: compact.offsets[span.start], end: compact.offsets[span.end - 1] + 1 }
}

/** `spans` are normalized-text ranges; `distance` is the edit count (0 for exact pieces). */
function toMatch(
  field: PaletteIndexedField,
  spans: readonly TextSpan[],
  distance: number
): PaletteDocumentMatch {
  const quality = distance === 0 ? 'compact' : 'typo'
  const assignment: PaletteTokenAssignment = {
    tokenIndex: 0,
    fieldId: field.id,
    quality,
    ranges: spans.map((span) => mapNormalizedRange(field.text, span.start, span.end))
  }
  return {
    qualityClass: resolvePaletteResultQualityClass({
      worstQuality: quality,
      usesSupportingEvidence: false
    }),
    rank: {
      ...createPaletteFallbackRank(),
      // 1 separator-blind equality, 2 edit-distance recovery: keeps normalized ahead of fuzzy.
      recovery: distance === 0 ? 1 : 2,
      wordMatch: 1,
      coverage: coverage(field),
      recoveryTokenCount: 1,
      strength: distance === 0 ? 4 : 5,
      placement: spans[0].start === 0 ? 0 : 2
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

// Shorter pieces would let initials ("hc") match far too many names.
const WORD_PREFIX_MIN_PIECE = 2

/**
 * Splits the compact query into word prefixes, in order, skipping words between them:
 * `gardenhub` -> **Garden**Relay**Hub**. Each piece starts a word and has 2+ chars.
 */
function matchWordPrefixChain(query: string, words: readonly PaletteWord[]): TextSpan[] | null {
  const failed = new Set<number>()
  const visit = (queryIndex: number, wordIndex: number): TextSpan[] | null => {
    if (queryIndex === query.length) {
      return []
    }
    const key = queryIndex * (words.length + 1) + wordIndex
    if (failed.has(key)) {
      return null
    }
    for (let w = wordIndex; w < words.length; w += 1) {
      const word = words[w].text
      const longest = Math.min(word.length, query.length - queryIndex)
      // Longest piece first, so the highlight covers whole words where it can.
      for (let length = longest; length >= WORD_PREFIX_MIN_PIECE; length -= 1) {
        if (!word.startsWith(query.slice(queryIndex, queryIndex + length))) {
          continue
        }
        const rest = visit(queryIndex + length, w + 1)
        if (rest) {
          return [{ start: words[w].start, end: words[w].start + length }, ...rest]
        }
      }
    }
    failed.add(key)
    return null
  }
  const spans = visit(0, 0)
  // One piece is a plain prefix, which the substring pass already covers.
  return spans && spans.length > 1 ? spans : null
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
 * `garden relayhub` or `gardenhub` -> "GardenRelay Hub"; ranks after every token match.
 */
export function matchPaletteDocumentCompactQuery(
  document: PaletteDocument,
  query: CompactPaletteQuery
): PaletteDocumentMatch | null {
  for (const field of searchableFields(document, 'compact')) {
    const compact = compactField(field)
    const index = compact.text.indexOf(query.text)
    if (index !== -1) {
      const span = { start: index, end: index + query.text.length, distance: 0 }
      return toMatch(field, [compactSpanToText(compact, span)], 0)
    }
  }
  for (const field of searchableFields(document, 'compact')) {
    const spans = matchWordPrefixChain(query.text, field.words)
    if (spans) {
      return toMatch(field, spans, 0)
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
  return best
    ? toMatch(best.field, [compactSpanToText(best.compact, best.span)], best.span.distance)
    : null
}
