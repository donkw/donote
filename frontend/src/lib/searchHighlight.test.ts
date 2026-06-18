import { Schema } from '@milkdown/kit/prose/model'
import { describe, expect, test } from 'vitest'
import { buildSearchDecorations } from './searchHighlight'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'text*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    text: { group: 'inline' },
  },
})

function paragraph(text: string) {
  return schema.node('paragraph', null, text ? schema.text(text) : undefined)
}

describe('searchHighlight', () => {
  test('creates decorations for case-insensitive text matches', () => {
    const doc = schema.node('doc', null, [paragraph('Intro body intro')])

    const decorations = buildSearchDecorations(doc, {
      query: 'intro',
      activeIndex: 1,
    }).find()

    expect(
      decorations.map((decoration) => ({
        from: decoration.from,
        to: decoration.to,
        className: decoration.spec.className,
        index: decoration.spec.searchMatchIndex,
      })),
    ).toEqual([
      {
        from: 1,
        to: 6,
        className: 'donote-search-match',
        index: 0,
      },
      {
        from: 12,
        to: 17,
        className: 'donote-search-match donote-search-match--active',
        index: 1,
      },
    ])
  })

  test('returns an empty decoration set for an empty query', () => {
    const doc = schema.node('doc', null, [paragraph('Intro')])

    expect(buildSearchDecorations(doc, { query: '', activeIndex: -1 }).find()).toEqual([])
  })
})
