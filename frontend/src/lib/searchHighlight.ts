import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'

export interface SearchHighlightState {
  query: string
  activeIndex: number
}

const searchMatchClass = 'donote-search-match'
const activeSearchMatchClass = 'donote-search-match--active'

export const searchHighlightPluginKey = new PluginKey<SearchHighlightState>(
  'DONOTE_SEARCH_HIGHLIGHT',
)

export function createSearchHighlightPlugin(initialState: SearchHighlightState) {
  return new Plugin<SearchHighlightState>({
    key: searchHighlightPluginKey,
    state: {
      init: () => initialState,
      apply(transaction, value) {
        return transaction.getMeta(searchHighlightPluginKey) ?? value
      },
    },
    props: {
      decorations(state) {
        return buildSearchDecorations(
          state.doc,
          searchHighlightPluginKey.getState(state) ?? initialState,
        )
      },
    },
  })
}

export function buildSearchDecorations(
  doc: ProseMirrorNode,
  state: SearchHighlightState,
): DecorationSet {
  if (!state.query) {
    return DecorationSet.empty
  }

  const needle = state.query.toLocaleLowerCase()
  const decorations: Decoration[] = []
  let matchIndex = 0

  doc.descendants((node, position) => {
    if (!node.isText) {
      return
    }

    const text = node.text ?? ''
    const haystack = text.toLocaleLowerCase()
    let cursor = 0

    while (cursor <= haystack.length) {
      const start = haystack.indexOf(needle, cursor)
      if (start === -1) {
        break
      }

      const end = start + needle.length
      const className =
        matchIndex === state.activeIndex
          ? `${searchMatchClass} ${activeSearchMatchClass}`
          : searchMatchClass

      decorations.push(
        Decoration.inline(
          position + start,
          position + end,
          { class: className },
          { className, searchMatchIndex: matchIndex },
        ),
      )
      matchIndex += 1
      cursor = end
    }
  })

  return decorations.length ? DecorationSet.create(doc, decorations) : DecorationSet.empty
}
