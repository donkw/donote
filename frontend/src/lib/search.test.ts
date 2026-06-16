import { describe, expect, test } from 'vitest'
import { findMatches, nextMatchIndex, previousMatchIndex } from './search'

describe('document search', () => {
  test('finds case-insensitive matches with ranges', () => {
    const result = findMatches('Alpha beta alpha', 'ALPHA')

    expect(result.query).toBe('ALPHA')
    expect(result.matches).toEqual([
      { start: 0, end: 5 },
      { start: 11, end: 16 },
    ])
  })

  test('cycles through match indexes', () => {
    expect(nextMatchIndex(-1, 3)).toBe(0)
    expect(nextMatchIndex(2, 3)).toBe(0)
    expect(previousMatchIndex(0, 3)).toBe(2)
    expect(previousMatchIndex(1, 3)).toBe(0)
    expect(nextMatchIndex(0, 0)).toBe(-1)
  })
})
