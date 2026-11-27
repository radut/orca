import { describe, expect, it } from 'vitest'
import {
  matchPaletteDocumentCompactQuery,
  matchPaletteDocumentTypoQuery,
  prepareCompactPaletteQuery
} from './compact-query-match'
import { matchPaletteDocument } from './match-document'
import {
  buildPaletteDocument,
  comparePaletteSemanticRank,
  type PaletteDocument,
  type PaletteDocumentMatch
} from './palette-document'
import { preparePaletteQuery } from './palette-query'

const NAMES = [
  'Garden Relay',
  'Garden-Relay',
  'Garden-Relay-2',
  'Orchard Mirror',
  'OrchardStone-Mirror'
]

function search(query: string): string[] {
  const prepared = preparePaletteQuery(query)
  if (prepared.state !== 'ready') {
    return []
  }
  const compact = prepareCompactPaletteQuery(prepared.normalized)
  const documents = NAMES.map((name) =>
    buildPaletteDocument({
      id: name,
      visibleFields: [
        {
          id: 'name',
          profile: 'structured-label',
          text: name,
          role: 'primary',
          destinationEligible: true
        }
      ],
      evidence: []
    })
  )
  const collect = (
    matcher: (document: PaletteDocument) => PaletteDocumentMatch | null
  ): { name: string; match: PaletteDocumentMatch }[] =>
    documents.flatMap((document) => {
      const match = matcher(document)
      return match ? [{ name: document.id, match }] : []
    })
  let hits = collect(
    (document) =>
      matchPaletteDocument({
        document,
        tokens: prepared.tokens,
        normalizedQuery: prepared.normalized
      }) ?? (compact ? matchPaletteDocumentCompactQuery(document, compact) : null)
  )
  if (!hits.length && compact) {
    hits = collect((document) => matchPaletteDocumentTypoQuery(document, compact))
  }
  return hits
    .sort((a, b) => comparePaletteSemanticRank(a.match.rank, b.match.rank))
    .map((hit) => `${hit.name}:${hit.match.assignments[0].quality}`)
}

describe('palette whole-query compact and typo fallback', () => {
  it('ignores word splits, separators and case', () => {
    for (const query of [
      'garden relay',
      'gardenrelay',
      'garde nrelay',
      'GARDEN-relay',
      'gar_den/re.lay'
    ]) {
      expect(
        search(query)
          .map((hit) => hit.split(':')[0])
          .sort()
      ).toEqual(['Garden Relay', 'Garden-Relay', 'Garden-Relay-2'])
    }
  })

  it('keeps token matches ahead of the compact and typo fallbacks', () => {
    expect(search('gardenrelay')).toEqual([
      'Garden-Relay:compact',
      'Garden-Relay-2:compact',
      'Garden Relay:compact'
    ])
    expect(search('gardnrelay')).toEqual([
      'Garden Relay:typo',
      'Garden-Relay:typo',
      'Garden-Relay-2:typo'
    ])
    expect(search('orchardmirrr')).toEqual(['Orchard Mirror:typo'])
  })

  it('matches word prefixes in order, skipping words between them', () => {
    expect(search('orchardmirror').sort()).toEqual([
      'Orchard Mirror:compact',
      'OrchardStone-Mirror:compact'
    ])
    expect(search('orchmirr').sort()).toEqual([
      'Orchard Mirror:compact',
      'OrchardStone-Mirror:compact'
    ])
    expect(search('mirrorstone')).toEqual([])
  })

  it('bounds typo tolerance by query length and skips digits', () => {
    expect(search('grd')).toEqual([])
    expect(search('gzzd')).toEqual([])
    expect(search('orchxxxd')).toEqual([])
    expect(search('relay3')).toEqual([])
  })
})
