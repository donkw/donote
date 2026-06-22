import { flushPromises, mount } from '@vue/test-utils'
import { editorViewCtx } from '@milkdown/kit/core'
import { Schema, type Node as ProseMirrorNode } from '@milkdown/kit/prose/model'
import { EditorState, TextSelection, type Transaction } from '@milkdown/kit/prose/state'
import { describe, expect, test, vi } from 'vitest'
import MilkdownHost from './MilkdownHost.vue'

const editorAction = vi.hoisted(() => vi.fn())

vi.mock('@milkdown/vue', () => ({
  Milkdown: {
    name: 'Milkdown',
    template:
      '<div data-test="milkdown"><img alt="local" src="../assets/photo.png" title="donote-width=220" /><img alt="remote" src="https://example.com/photo.png" /></div>',
  },
  useEditor: () => ({
    get: () => ({
      action: editorAction,
    }),
  }),
}))

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'text*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0],
    },
    list_item: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM: () => ['li', 0],
    },
    text: { group: 'inline' },
  },
})

async function waitForAssertion(assertion: () => void) {
  let lastError: unknown
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => window.setTimeout(resolve, 10))
      await flushPromises()
    }
  }
  throw lastError
}

function dispatchPointerEvent(
  target: EventTarget,
  type: string,
  options: { clientX: number; pointerId?: number; button?: number },
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clientX', { value: options.clientX })
  Object.defineProperty(event, 'pointerId', { value: options.pointerId ?? 1 })
  Object.defineProperty(event, 'button', { value: options.button ?? 0 })
  target.dispatchEvent(event)
}

function mockRect(element: Element, rect: Partial<DOMRect>) {
  element.getBoundingClientRect = vi.fn(
    () =>
      ({
        x: rect.left ?? 0,
        y: rect.top ?? 0,
        left: rect.left ?? 0,
        top: rect.top ?? 0,
        right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
        bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        toJSON: () => ({}),
      }) as DOMRect,
  )
}

function paragraph(text: string) {
  return schema.node('paragraph', null, schema.text(text))
}

function listItem(content: ProseMirrorNode[]) {
  return schema.node('list_item', null, content)
}

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

function nestedListEditorState() {
  const doc = schema.node('doc', null, [
    schema.node('bullet_list', null, [
      listItem([
        paragraph('Parent'),
        schema.node('bullet_list', null, [listItem([paragraph('Child')])]),
      ]),
    ]),
  ])
  return EditorState.create({
    doc,
    selection: TextSelection.create(doc, textPosition(doc, 'Child') + 1),
  })
}

describe('MilkdownHost', () => {
  test('captures Shift+Tab in a list item and dispatches a list outdent before focus can move', async () => {
    const state = nestedListEditorState()
    const editorView = {
      state,
      dispatchedTransactions: [] as Transaction[],
      dispatch(transaction: Transaction) {
        this.dispatchedTransactions.push(transaction)
      },
    }
    editorAction.mockImplementation((callback) => {
      callback({
        get: (key: unknown) => {
          if (key === editorViewCtx) {
            return editorView
          }
          throw new Error('Unexpected editor context key')
        },
      })
    })

    const wrapper = mount(MilkdownHost, {
      props: {
        modelValue: '- Parent\n  - Child',
        activePath: 'notes/intro.md',
      },
    })

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    wrapper.element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(editorView.dispatchedTransactions).toHaveLength(1)

    const nextState = state.apply(editorView.dispatchedTransactions[0])
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

  test('resolves relative workspace image sources for display', async () => {
    const resolveImageSource = vi.fn().mockResolvedValue('data:image/png;base64,aW1hZ2U=')

    const wrapper = mount(MilkdownHost, {
      props: {
        modelValue: '![local](../assets/photo.png)',
        activePath: 'notes/intro.md',
        resolveImageSource,
      },
    })

    await waitForAssertion(() => {
      expect(resolveImageSource).toHaveBeenCalledWith('../assets/photo.png', 'notes/intro.md')
    })

    const localImage = wrapper.get('img[alt="local"]').element as HTMLImageElement
    const remoteImage = wrapper.get('img[alt="remote"]').element as HTMLImageElement

    expect(localImage.getAttribute('src')).toBe('data:image/png;base64,aW1hZ2U=')
    expect(localImage.style.width).toBe('220px')
    expect(localImage.getAttribute('title')).toBeNull()
    expect(remoteImage.getAttribute('src')).toBe('https://example.com/photo.png')
    expect(resolveImageSource).toHaveBeenCalledTimes(1)
  })

  test('resizes images by dragging the handle and persists width in markdown', async () => {
    const resolveImageSource = vi.fn().mockResolvedValue('data:image/png;base64,aW1hZ2U=')
    const wrapper = mount(MilkdownHost, {
      props: {
        modelValue: '![local](../assets/photo.png)',
        activePath: 'notes/intro.md',
        resolveImageSource,
      },
    })

    await waitForAssertion(() => {
      expect(resolveImageSource).toHaveBeenCalledWith('../assets/photo.png', 'notes/intro.md')
    })

    const localImage = wrapper.get('img[alt="local"]').element as HTMLImageElement
    mockRect(wrapper.element, { left: 0, top: 0, width: 600, height: 400 })
    mockRect(localImage, { left: 20, top: 30, right: 220, bottom: 130, width: 200, height: 100 })

    dispatchPointerEvent(localImage, 'pointerdown', { clientX: 220 })
    const handle = wrapper.get('[data-test="image-resize-handle"]')
    dispatchPointerEvent(handle.element, 'pointerdown', { clientX: 220 })
    dispatchPointerEvent(window, 'pointermove', { clientX: 280 })
    dispatchPointerEvent(window, 'pointerup', { clientX: 280 })

    expect(localImage.style.width).toBe('260px')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(
      '![local](../assets/photo.png "donote-width=260")',
    )
  })
})
