import { describe, expect, it } from 'vitest'
import { nameSearchMatches, prepareNameSearchQuery } from './name-search-match'

function matches(query: string, fields: string[]): boolean {
  const prepared = prepareNameSearchQuery(query)
  if (!prepared) {
    throw new Error(`query "${query}" did not prepare`)
  }
  return nameSearchMatches(prepared, fields)
}

describe('nameSearchMatches', () => {
  it.each([
    ['labcluster', ['lab cluster'], true],
    ['labcluster', ['lab-cluster'], true],
    ['lab cluster', ['lab_cluster'], true],
    ['labclustr', ['lab cluster'], true],
    ['billing main', ['billing api', 'main'], true],
    ['homecluater', ['HomeLab Cluster'], true],
    ['homecluster', ['HomeLab Cluster'], true],
    ['hlcluster', ['HomeLab Cluster'], true],
    ['wphomelab', ['wp blog', 'main', 'HomeLab Cluster'], true],
    ['cluaterhome', ['HomeLab Cluster'], false],
    ['zzz', ['HomeLab Cluster'], false],
    ['labcluster', ['billing api'], false],
    ['lab', ['billing api'], false]
  ])('%s in %j -> %s', (query, fields, expected) => {
    expect(matches(query, fields)).toBe(expected)
  })
})
