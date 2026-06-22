import { Schema, type Node as ProseMirrorNode } from '@milkdown/kit/prose/model'
import { EditorState, TextSelection, type Transaction } from '@milkdown/kit/prose/state'
import { describe, expect, test, vi } from 'vitest'
import {
  buildActiveMarkdownLineDecorations,
  createActiveMarkdownLinePlugin,
  outdentCurrentListItem,
} from './activeMarkdownLine'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'text*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    heading: {
      attrs: { level: { default: 1 } },
      content: 'text*',
      group: 'block',
      defining: true,
      parseDOM: [{ tag: 'h1', attrs: { level: 1 } }],
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
    blockquote: {
      content: 'block+',
      group: 'block',
      parseDOM: [{ tag: 'blockquote' }],
      toDOM: () => ['blockquote', 0],
    },
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0],
    },
    ordered_list: {
      attrs: { order: { default: 1 } },
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ol' }],
      toDOM: () => ['ol', 0],
    },
    list_item: {
      attrs: {
        label: { default: '•' },
        listType: { default: 'bullet' },
        spread: { default: true },
      },
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM: (node) => [
        'li',
        {
          'data-label': node.attrs.label,
          'data-list-type': node.attrs.listType,
          'data-spread': node.attrs.spread,
        },
        0,
      ],
    },
    text: { group: 'inline' },
  },
})

function textPosition(doc: ProseMirrorNode, text: string) {
  let found = -1
  doc.descendants((node, position) => {
    if (node.isText && node.text === text) {
      found = position
      return false
    }
    return true
  })
  if (found < 0) {
    throw new Error(`Text not found: ${text}`)
  }
  return found
}

function stateWithCursor(doc: ProseMirrorNode, text: string) {
  return EditorState.create({
    doc,
    selection: TextSelection.create(doc, textPosition(doc, text) + 1),
  })
}

function paragraph(text: string) {
  return schema.node('paragraph', null, text ? schema.text(text) : undefined)
}

function listItem(content: ProseMirrorNode[], attrs?: Record<string, unknown>) {
  return schema.node('list_item', attrs ?? null, content)
}

describe('activeMarkdownLine', () => {
  test('marks the active heading with its markdown prefix', () => {
    const doc = schema.node('doc', null, [
      schema.node('heading', { level: 2 }, schema.text('Title')),
      paragraph('Body'),
    ])
    const state = stateWithCursor(doc, 'Title')

    const decorations = buildActiveMarkdownLineDecorations(state.doc, state.selection).find()

    expect(
      decorations.map((decoration) => ({
        from: decoration.from,
        className: decoration.spec.className,
        markdownPrefix: decoration.spec.markdownPrefix,
        nodeType: decoration.spec.nodeType,
      })),
    ).toEqual([
      {
        from: 0,
        className: 'donote-active-markdown-line',
        markdownPrefix: '## ',
        nodeType: 'heading',
      },
    ])
  })

  test('marks the nearest active list item with a canonical list marker', () => {
    const nestedList = schema.node('bullet_list', null, [
      listItem([
        paragraph('Parent'),
        schema.node('bullet_list', null, [listItem([paragraph('Child')])]),
      ]),
    ])
    const state = stateWithCursor(schema.node('doc', null, [nestedList]), 'Child')

    const decorations = buildActiveMarkdownLineDecorations(state.doc, state.selection).find()

    expect(decorations).toHaveLength(1)
    expect(decorations[0].spec).toMatchObject({
      className: 'donote-active-markdown-line',
      markdownPrefix: '- ',
      nodeType: 'list_item',
    })
  })

  test('marks the active blockquote with a markdown quote marker', () => {
    const doc = schema.node('doc', null, [
      schema.node('blockquote', null, [paragraph('Quoted')]),
      paragraph('Body'),
    ])
    const state = stateWithCursor(doc, 'Quoted')

    const decorations = buildActiveMarkdownLineDecorations(state.doc, state.selection).find()

    expect(decorations[0].spec).toMatchObject({
      className: 'donote-active-markdown-line',
      markdownPrefix: '> ',
      nodeType: 'blockquote',
    })
  })

  test('handles Shift+Tab by lifting the current list item', () => {
    const doc = schema.node('doc', null, [
      schema.node('bullet_list', null, [
        listItem([
          paragraph('Parent'),
          schema.node('bullet_list', null, [listItem([paragraph('Child')])]),
        ]),
      ]),
    ])
    const state = stateWithCursor(doc, 'Child')
    const dispatch = vi.fn()

    expect(outdentCurrentListItem(state, dispatch)).toBe(true)
    expect(dispatch).toHaveBeenCalledOnce()

    const nextState = state.apply(dispatch.mock.calls[0][0])
    expect(nextState.doc.toJSON()).toMatchObject({
      content: [
        {
          type: 'bullet_list',
          content: [
            { type: 'list_item' },
            {
              type: 'list_item',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Child' }] }],
            },
          ],
        },
      ],
    })
  })

  test('plugin consumes Shift+Tab in list items and leaves normal Tab to default handling', () => {
    const plugin = createActiveMarkdownLinePlugin()
    const state = stateWithCursor(
      schema.node('doc', null, [
        schema.node('bullet_list', null, [
          listItem([
            paragraph('Parent'),
            schema.node('bullet_list', null, [listItem([paragraph('Child')])]),
          ]),
        ]),
      ]),
      'Child',
    )
    const dispatch = vi.fn()
    const view = { state, dispatch } as never
    const handleKeyDown = plugin.props.handleKeyDown

    expect(handleKeyDown?.call(plugin, view, new KeyboardEvent('keydown', { key: 'Tab' }))).toBe(
      false,
    )
    expect(
      handleKeyDown?.call(
        plugin,
        view,
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }),
      ),
    ).toBe(true)
    expect(dispatch).toHaveBeenCalledOnce()
  })

  test('plugin keeps the editor view bound when dispatching Shift+Tab outdents', () => {
    const plugin = createActiveMarkdownLinePlugin()
    const state = stateWithCursor(
      schema.node('doc', null, [
        schema.node('bullet_list', null, [
          listItem([
            paragraph('Parent'),
            schema.node('bullet_list', null, [listItem([paragraph('Child')])]),
          ]),
        ]),
      ]),
      'Child',
    )
    let dispatchThis: unknown = null
    let dispatchedTransaction: Transaction | null = null
    const view = {
      state,
      dispatch(this: unknown, transaction: Transaction) {
        dispatchThis = this
        dispatchedTransaction = transaction
      },
    }
    const handleKeyDown = plugin.props.handleKeyDown

    expect(
      handleKeyDown?.call(
        plugin,
        view as never,
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }),
      ),
    ).toBe(true)
    expect(dispatchThis).toBe(view)
    expect(dispatchedTransaction).not.toBeNull()
  })
})
