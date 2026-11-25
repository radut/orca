import type { PaletteIndexedField } from './indexed-field'
import type { PaletteDocument, PaletteDocumentMatch } from './palette-document'
import {
  compactField,
  findApproximateSubstring,
  searchableFields,
  toCompactMatch,
  type CompactMatchPart,
  type CompactPaletteQuery,
  type TextSpan,
  wordPrefixMinPiece
} from './compact-query-match'

type ChainPiece = { fieldIndex: number; span: TextSpan }

function groupByField(
  fields: readonly PaletteIndexedField[],
  pieces: readonly ChainPiece[]
): CompactMatchPart[] {
  const parts: { field: PaletteIndexedField; spans: TextSpan[] }[] = []
  for (const piece of pieces) {
    const field = fields[piece.fieldIndex]
    const part = parts.find((entry) => entry.field === field)
    if (part) {
      part.spans.push(piece.span)
    } else {
      parts.push({ field, spans: [piece.span] })
    }
  }
  return parts
}

/**
 * Word prefixes taken from two or more fields, e.g. a host and a workspace name:
 * `orchardgarden` -> host **Orchard** + **Garden**Relay. Inside one field the words keep
 * their order; each field is entered once, in any order.
 */
function matchCrossFieldWordChain(
  query: string,
  fields: readonly PaletteIndexedField[]
): ChainPiece[] | null {
  const failed = new Set<string>()
  const visit = (
    queryIndex: number,
    fieldIndex: number,
    wordIndex: number,
    entered: number,
    contiguous: boolean
  ): ChainPiece[] | null => {
    if (queryIndex === query.length) {
      // A single field is the per-field pass's job.
      return entered & (entered - 1) ? [] : null
    }
    const key = `${queryIndex}:${fieldIndex}:${wordIndex}:${entered}:${contiguous}`
    if (failed.has(key)) {
      return null
    }
    for (let next = 0; next < fields.length; next += 1) {
      const sameField = next === fieldIndex
      if (!sameField && entered & (1 << next)) {
        continue
      }
      const words = fields[next].words
      for (let w = sameField ? wordIndex : 0; w < words.length; w += 1) {
        const word = words[w]
        const longest = Math.min(word.text.length, query.length - queryIndex)
        const shortest = wordPrefixMinPiece(w, sameField ? wordIndex : -1, contiguous)
        for (let length = longest; length >= shortest; length -= 1) {
          if (!word.text.startsWith(query.slice(queryIndex, queryIndex + length))) {
            continue
          }
          const whole = length === word.text.length
          const rest = visit(queryIndex + length, next, w + 1, entered | (1 << next), whole)
          if (rest) {
            const span = { start: word.start, end: word.start + length }
            return [{ fieldIndex: next, span }, ...rest]
          }
        }
      }
    }
    failed.add(key)
    return null
  }
  return visit(0, -1, 0, 0, false)
}

/** Whole-query fallback across fields, run after the per-field compact pass found nothing. */
export function matchPaletteDocumentCrossFieldQuery(
  document: PaletteDocument,
  query: CompactPaletteQuery
): PaletteDocumentMatch | null {
  const fields = searchableFields(document, 'compact').filter((field) => field.words.length)
  if (fields.length < 2) {
    return null
  }
  const pieces = matchCrossFieldWordChain(query.text, fields)
  return pieces ? toCompactMatch(groupByField(fields, pieces), 0) : null
}

/**
 * Typo variant: the query within the edit budget of two fields joined in either order,
 * e.g. a host name followed by a project or workspace name. Only spans touching both count.
 */
export function matchPaletteDocumentCrossFieldTypoQuery(
  document: PaletteDocument,
  query: CompactPaletteQuery
): PaletteDocumentMatch | null {
  if (query.maxEdits === 0) {
    return null
  }
  const fields = searchableFields(document, 'typo').filter((field) => compactField(field).text)
  let best: { pieces: ChainPiece[]; distance: number } | null = null
  for (let first = 0; first < fields.length; first += 1) {
    for (let second = 0; second < fields.length; second += 1) {
      if (first === second) {
        continue
      }
      const left = compactField(fields[first])
      const right = compactField(fields[second])
      const span = findApproximateSubstring(query.text, left.text + right.text, query.maxEdits)
      const split = left.text.length
      // The left part must start a word: `nuctmain` is not "…ut" + "main".
      if (!span || span.start >= split || span.end <= split) {
        continue
      }
      const leftStart = left.offsets[span.start]
      if (!fields[first].words.some((word) => word.start === leftStart)) {
        continue
      }
      if (best && best.distance <= span.distance) {
        continue
      }
      const rightEnd = span.end - split
      best = {
        distance: span.distance,
        pieces: [
          {
            fieldIndex: first,
            span: { start: leftStart, end: left.offsets[split - 1] + 1 }
          },
          {
            fieldIndex: second,
            span: { start: right.offsets[0], end: right.offsets[rightEnd - 1] + 1 }
          }
        ]
      }
    }
  }
  return best ? toCompactMatch(groupByField(fields, best.pieces), best.distance) : null
}
