import { levenshtein } from '../text/edit-distance'
import {
  searchableFields,
  toCompactMatch,
  wordPrefixMinPiece,
  type CompactPaletteQuery
} from './compact-query-match'
import { groupByField, type ChainPiece } from './cross-field-query-match'
import type { PaletteIndexedField } from './indexed-field'
import type { PaletteDocument, PaletteDocumentMatch } from './palette-document'
import { PALETTE_TYPO_MIN_LENGTH } from './typo-distance'

type Chain = { pieces: ChainPiece[]; distance: number }

const MAX_CHAIN_FIELDS = 30

/** Edits for one word-prefix piece against its query slice; short pieces must match exactly. */
function pieceDistance(prefix: string, slice: string, budget: number): number {
  if (prefix === slice) {
    return 0
  }
  return prefix.length < PALETTE_TYPO_MIN_LENGTH ? budget + 1 : levenshtein(prefix, slice)
}

/**
 * Word prefixes in order, skipping whole words, across one or more fields, with the edits
 * shared by the pieces: `homecluater` -> **Home**Lab **Cluster**.
 */
function matchTypoWordChain(
  query: string,
  fields: readonly PaletteIndexedField[],
  maxEdits: number
): Chain | null {
  const failed = new Set<string>()
  const visit = (
    queryIndex: number,
    fieldIndex: number,
    wordIndex: number,
    entered: number,
    contiguous: boolean,
    budget: number
  ): Chain | null => {
    if (queryIndex === query.length) {
      return { pieces: [], distance: 0 }
    }
    const key = `${queryIndex}:${fieldIndex}:${wordIndex}:${entered}:${contiguous}:${budget}`
    if (failed.has(key)) {
      return null
    }
    const remaining = query.length - queryIndex
    for (let next = 0; next < fields.length; next += 1) {
      const sameField = next === fieldIndex
      if (!sameField && entered & (1 << next)) {
        continue
      }
      const words = fields[next].words
      for (let w = sameField ? wordIndex : 0; w < words.length; w += 1) {
        const word = words[w].text
        // Typos never touch a piece's first letter, which keeps the search narrow.
        if (word[0] !== query[queryIndex]) {
          continue
        }
        const shortest = wordPrefixMinPiece(w, sameField ? wordIndex : -1, contiguous)
        for (
          let length = Math.min(word.length, remaining + budget);
          length >= shortest;
          length -= 1
        ) {
          const prefix = word.slice(0, length)
          const slack = length < PALETTE_TYPO_MIN_LENGTH ? 0 : budget
          for (let taken = length - slack; taken <= length + slack; taken += 1) {
            if (taken < 1 || taken > remaining) {
              continue
            }
            const distance = pieceDistance(
              prefix,
              query.slice(queryIndex, queryIndex + taken),
              budget
            )
            if (distance > budget) {
              continue
            }
            const rest = visit(
              queryIndex + taken,
              next,
              w + 1,
              entered | (1 << next),
              length === word.length,
              budget - distance
            )
            if (rest) {
              const span = { start: words[w].start, end: words[w].start + length }
              return {
                pieces: [{ fieldIndex: next, span }, ...rest.pieces],
                distance: distance + rest.distance
              }
            }
          }
        }
      }
    }
    failed.add(key)
    return null
  }
  return visit(0, -1, 0, 0, false, maxEdits)
}

/** Typo fallback for queries that skip words, which the substring typo pass cannot bridge. */
export function matchPaletteDocumentWordChainTypoQuery(
  document: PaletteDocument,
  query: CompactPaletteQuery
): PaletteDocumentMatch | null {
  if (query.maxEdits === 0) {
    return null
  }
  const fields = searchableFields(document, 'typo')
    .filter((field) => field.words.length)
    .slice(0, MAX_CHAIN_FIELDS)
  const chain = matchTypoWordChain(query.text, fields, query.maxEdits)
  // One piece is a plain prefix, which the substring typo pass already covers.
  return chain && chain.pieces.length > 1
    ? toCompactMatch(groupByField(fields, chain.pieces), chain.distance)
    : null
}
