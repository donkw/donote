export interface SearchMatch {
  start: number
  end: number
}

export interface SearchResult {
  query: string
  matches: SearchMatch[]
}

export function findMatches(content: string, query: string): SearchResult {
  if (!query) {
    return { query, matches: [] }
  }

  const haystack = content.toLocaleLowerCase()
  const needle = query.toLocaleLowerCase()
  const matches: SearchMatch[] = []
  let cursor = 0

  while (cursor <= haystack.length) {
    const start = haystack.indexOf(needle, cursor)
    if (start === -1) {
      break
    }
    const end = start + needle.length
    matches.push({ start, end })
    cursor = end
  }

  return { query, matches }
}

export function nextMatchIndex(currentIndex: number, total: number): number {
  if (total <= 0) {
    return -1
  }
  return (currentIndex + 1 + total) % total
}

export function previousMatchIndex(currentIndex: number, total: number): number {
  if (total <= 0) {
    return -1
  }
  return (currentIndex - 1 + total) % total
}
