import { prepareCompactPaletteQuery, type CompactPaletteQuery } from './compact-query-match'
import { matchPaletteDocument } from './match-document'
import { normalizePaletteText } from './normalized-text'
import { buildPaletteDocument, type PaletteDocument } from './palette-document'
import { preparePaletteQuery, type PreparedPaletteQuery } from './palette-query'
import {
  matchPaletteDocumentWholeQuery,
  matchPaletteDocumentWholeQueryTypo
} from './palette-whole-query-fallbacks'

/** A search box's text, prepared once per keystroke for filtering many rows. */
export type NameSearchQuery =
  | {
      kind: 'palette'
      prepared: Extract<PreparedPaletteQuery, { state: 'ready' }>
      compact: CompactPaletteQuery | null
    }
  /** A query the palette rejects as too large still filters, by plain substring. */
  | { kind: 'literal'; normalized: string }

/** Null for a blank query, which lists everything. */
export function prepareNameSearchQuery(query: string): NameSearchQuery | null {
  const prepared = preparePaletteQuery(query)
  if (prepared.state === 'ready') {
    return { kind: 'palette', prepared, compact: prepareCompactPaletteQuery(prepared.normalized) }
  }
  const normalized = normalizePaletteText(query).normalized.trim()
  return prepared.state === 'empty' || !normalized ? null : { kind: 'literal', normalized }
}

const DOCUMENT_CACHE_LIMIT = 4000
// Rows keep their names across keystrokes, so each one is segmented once.
const documentCache = new Map<string, PaletteDocument>()

function documentFor(fields: readonly (string | null | undefined)[]): PaletteDocument {
  const texts = fields.map((field) => field ?? '')
  const key = texts.join('\u0000')
  let document = documentCache.get(key)
  if (!document) {
    if (documentCache.size >= DOCUMENT_CACHE_LIMIT) {
      documentCache.clear()
    }
    document = buildPaletteDocument({
      id: key,
      visibleFields: texts.map((text, index) => ({
        id: `field-${index}`,
        profile: 'structured-label',
        text,
        role: index === 0 ? 'primary' : 'secondary',
        destinationEligible: index === 0
      })),
      evidence: []
    })
    documentCache.set(key, document)
  }
  return document
}

/**
 * The workspace palette's rules as a yes/no filter: its token matcher, then the whole query
 * with spaces and `-_/.` ignored (also skipping words and across fields), then those within
 * the typo budget. The first field is the row's name.
 */
export function nameSearchMatches(
  query: NameSearchQuery,
  fields: readonly (string | null | undefined)[]
): boolean {
  if (query.kind === 'literal') {
    return fields.some(
      (field) => field && normalizePaletteText(field).normalized.includes(query.normalized)
    )
  }
  const document = documentFor(fields)
  const { prepared, compact } = query
  if (
    matchPaletteDocument({
      document,
      tokens: prepared.tokens,
      normalizedQuery: prepared.normalized,
      tokenCountBeforeDeduplication: prepared.tokenCountBeforeDeduplication
    })
  ) {
    return true
  }
  return Boolean(
    compact &&
    (matchPaletteDocumentWholeQuery(document, compact) ??
      matchPaletteDocumentWholeQueryTypo(document, compact))
  )
}
