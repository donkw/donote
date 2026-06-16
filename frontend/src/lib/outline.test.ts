import { describe, expect, test } from 'vitest'
import { extractOutline } from './outline'

describe('extractOutline', () => {
  test('extracts markdown headings with line numbers and stable ids', () => {
    const outline = extractOutline('# Title\n\n## Section One\nText\n### 深入内容')

    expect(outline).toEqual([
      { id: 'title-1', level: 1, text: 'Title', line: 1 },
      { id: 'section-one-3', level: 2, text: 'Section One', line: 3 },
      { id: '深入内容-5', level: 3, text: '深入内容', line: 5 },
    ])
  })

  test('ignores headings inside fenced code blocks', () => {
    const outline = extractOutline('# Real\n```md\n# Not heading\n```\n## Also Real')

    expect(outline.map((item) => item.text)).toEqual(['Real', 'Also Real'])
  })
})
