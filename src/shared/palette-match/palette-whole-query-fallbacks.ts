import {
  matchPaletteDocumentCompactQuery,
  matchPaletteDocumentTypoQuery,
  type CompactPaletteQuery
} from './compact-query-match'
import {
  matchPaletteDocumentCrossFieldQuery,
  matchPaletteDocumentCrossFieldTypoQuery
} from './cross-field-query-match'
import type { PaletteDocument, PaletteDocumentMatch } from './palette-document'
import { matchPaletteDocumentWordChainTypoQuery } from './word-chain-typo-match'

/** Whole-query matches that ignore spaces and separators, for documents the token matcher rejected. */
export function matchPaletteDocumentWholeQuery(
  document: PaletteDocument,
  query: CompactPaletteQuery
): PaletteDocumentMatch | null {
  return (
    matchPaletteDocumentCompactQuery(document, query) ??
    matchPaletteDocumentCrossFieldQuery(document, query)
  )
}

/** The same within the typo budget; ranks after every exact match. */
export function matchPaletteDocumentWholeQueryTypo(
  document: PaletteDocument,
  query: CompactPaletteQuery
): PaletteDocumentMatch | null {
  return (
    matchPaletteDocumentTypoQuery(document, query) ??
    matchPaletteDocumentCrossFieldTypoQuery(document, query) ??
    matchPaletteDocumentWordChainTypoQuery(document, query)
  )
}
