import { describe, expect, it } from 'vitest'
import { prepareCompactPaletteQuery } from './compact-query-match'
import {
  matchPaletteDocumentCrossFieldQuery,
  matchPaletteDocumentCrossFieldTypoQuery
} from './cross-field-query-match'
import { buildPaletteDocument } from './palette-document'

const document = buildPaletteDocument({
  id: 'workspace',
  visibleFields: [
    {
      id: 'name',
      profile: 'structured-label',
      text: 'GardenRelay Hub',
      role: 'primary',
      destinationEligible: true
    },
    {
      id: 'host',
      profile: 'structured-label',
      text: 'OrchardBox',
      role: 'secondary',
      destinationEligible: false
    }
  ],
  evidence: []
})

function fieldsMatched(
  matcher: typeof matchPaletteDocumentCrossFieldQuery,
  query: string
): string[] | null {
  const compact = prepareCompactPaletteQuery(query)
  const match = compact ? matcher(document, compact) : null
  return match ? match.assignments.map((assignment) => assignment.fieldId).sort() : null
}

describe('palette whole-query match across fields', () => {
  it('joins word prefixes from the host and the name, in either order', () => {
    expect(fieldsMatched(matchPaletteDocumentCrossFieldQuery, 'orchardgardenhub')).toEqual([
      'host',
      'name'
    ])
    expect(fieldsMatched(matchPaletteDocumentCrossFieldQuery, 'gardenhuborchard')).toEqual([
      'host',
      'name'
    ])
    expect(fieldsMatched(matchPaletteDocumentCrossFieldQuery, 'gardenhub')).toBeNull()
    expect(fieldsMatched(matchPaletteDocumentCrossFieldQuery, 'hubgardenorchard')).toBeNull()
  })

  it('allows typos only within the budget across a field boundary', () => {
    expect(fieldsMatched(matchPaletteDocumentCrossFieldTypoQuery, 'orchrdboxgarden')).toEqual([
      'host',
      'name'
    ])
    expect(fieldsMatched(matchPaletteDocumentCrossFieldTypoQuery, 'oxxxxdboxgarden')).toBeNull()
  })
})
