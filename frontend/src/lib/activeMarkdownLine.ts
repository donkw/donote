import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model'
import type { EditorState, Transaction } from '@milkdown/kit/prose/state'
import { Plugin, PluginKey, type Selection } from '@milkdown/kit/prose/state'
import { liftListItem } from '@milkdown/kit/prose/schema-list'
import type { EditorView } from '@milkdown/kit/prose/view'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'

export const activeMarkdownLineClass = 'donote-active-markdown-line'
export const activeMarkdownLinePluginKey = new PluginKey('DONOTE_ACTIVE_MARKDOWN_LINE')

type Dispatch = (transaction: Transaction) => void

interface ActiveMarkdownNode {
  node: ProseMirrorNode
  position: number
  markdownPrefix: string
}

export function createActiveMarkdownLinePlugin() {
  return new Plugin({
    key: activeMarkdownLinePluginKey,
    props: {
      decorations(state) {
        return buildActiveMarkdownLineDecorations(state.doc, state.selection)
      },
      handleKeyDown(view, event) {
        if (!isListOutdentShortcut(event)) {
          return false
        }

        const handled = outdentCurrentListItemInView(view)
        if (handled) {
          event.preventDefault()
        }
        return handled
      },
    },
  })
}

export function buildActiveMarkdownLineDecorations(
  doc: ProseMirrorNode,
  selection: Selection,
) {
  const active = findActiveMarkdownNode(selection)
  if (!active) {
    return DecorationSet.empty
  }

  return DecorationSet.create(doc, [
    Decoration.node(
      active.position,
      active.position + active.node.nodeSize,
      {
        class: activeMarkdownLineClass,
        'data-donote-markdown-prefix': active.markdownPrefix,
      },
      {
        className: activeMarkdownLineClass,
        markdownPrefix: active.markdownPrefix,
        nodeType: active.node.type.name,
      },
    ),
  ])
}

export function outdentCurrentListItem(
  state: EditorState,
  dispatch?: Dispatch,
  view?: EditorView,
) {
  const listItemType = listItemTypeForState(state)
  if (!listItemType) {
    return false
  }
  return liftListItem(listItemType)(state, dispatch, view)
}

export function outdentCurrentListItemInView(view: EditorView) {
  return outdentCurrentListItem(view.state, (transaction) => view.dispatch(transaction), view)
}

export function isSelectionInListItem(state: EditorState) {
  const listItemType = listItemTypeForState(state)
  if (!listItemType) {
    return false
  }

  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === listItemType) {
      return true
    }
  }
  return false
}

function findActiveMarkdownNode(selection: Selection): ActiveMarkdownNode | null {
  const { $from } = selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    const markdownPrefix = markdownPrefixForNode(node)
    if (!markdownPrefix) {
      continue
    }

    return {
      node,
      position: $from.before(depth),
      markdownPrefix,
    }
  }
  return null
}

function markdownPrefixForNode(node: ProseMirrorNode) {
  switch (node.type.name) {
    case 'heading':
      return `${'#'.repeat(normalizeHeadingLevel(node.attrs.level))} `
    case 'blockquote':
      return '> '
    case 'list_item':
    case 'listItem':
      return listItemPrefix(node)
    default:
      return ''
  }
}

function normalizeHeadingLevel(value: unknown) {
  return typeof value === 'number' && value >= 1 && value <= 6 ? value : 1
}

function listItemPrefix(node: ProseMirrorNode) {
  if (node.attrs.listType === 'ordered') {
    const label = typeof node.attrs.label === 'string' ? node.attrs.label : ''
    return `${label && label !== '•' ? label : '1.'} `
  }
  return '- '
}

export function isListOutdentShortcut(event: KeyboardEvent) {
  return (
    event.key === 'Tab' &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  )
}

function listItemTypeForState(state: EditorState) {
  return state.schema.nodes.list_item ?? state.schema.nodes.listItem ?? null
}
