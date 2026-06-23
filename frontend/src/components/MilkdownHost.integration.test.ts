import { flushPromises, mount } from '@vue/test-utils'
import { editorViewCtx } from '@milkdown/kit/core'
import { MilkdownProvider } from '@milkdown/vue'
import { undo } from '@milkdown/kit/prose/history'
import { type ComponentPublicInstance, defineComponent } from 'vue'
import { describe, expect, test } from 'vitest'
import MilkdownHost from './MilkdownHost.vue'

async function waitForEditorTimers() {
  await new Promise((resolve) => window.setTimeout(resolve, 500))
  await flushPromises()
}

function getEditorView(wrapper: ReturnType<typeof mount>) {
  const host = wrapper.findComponent(MilkdownHost)
  const editor = (host.vm as ComponentPublicInstance & {
    $: { setupState?: { editor?: { get: () => { action: (callback: (ctx: unknown) => void) => void } } } }
  }).$.setupState?.editor
  let view: unknown
  editor?.get()?.action((ctx) => {
    view = (ctx as { get: (key: unknown) => unknown }).get(editorViewCtx)
  })
  if (!view) {
    throw new Error('ProseMirror view not found')
  }
  return view as {
    state: {
      doc: {
        descendants: (
          callback: (node: { isText: boolean; text?: string }, position: number) => boolean | void,
        ) => void
      }
    }
    dispatch: (transaction: unknown) => void
  }
}

function textEndPosition(view: ReturnType<typeof getEditorView>, text: string) {
  let position = -1
  view.state.doc.descendants((node, nodePosition) => {
    if (node.isText && node.text === text) {
      position = nodePosition + text.length
      return false
    }
    return true
  })
  if (position < 0) {
    throw new Error(`Text not found: ${text}`)
  }
  return position
}

function dispatchUserKey(target: Element, key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
  target.dispatchEvent(event)
  return event
}

describe('MilkdownHost integration', () => {
  test('does not emit editor-generated markdown normalization before the user edits', async () => {
    const wrapper = mount(
      defineComponent({
        components: { MilkdownHost, MilkdownProvider },
        template: `
          <MilkdownProvider>
            <MilkdownHost
              model-value="# Intro\n\n* item"
              active-path="intro.md"
              @update:model-value="handleUpdate"
            />
          </MilkdownProvider>
        `,
        methods: {
          handleUpdate(value: string) {
            this.$emit('update:modelValue', value)
          },
        },
      }),
    )

    await waitForEditorTimers()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  test('emits the editor normalized clean baseline after mounting', async () => {
    const wrapper = mount(
      defineComponent({
        components: { MilkdownHost, MilkdownProvider },
        template: `
          <MilkdownProvider>
            <MilkdownHost
              model-value="# Intro"
              active-path="intro.md"
              @sync-clean-content="handleSyncCleanContent"
            />
          </MilkdownProvider>
        `,
        methods: {
          handleSyncCleanContent(value: string) {
            this.$emit('syncCleanContent', value)
          },
        },
      }),
    )

    await waitForEditorTimers()

    expect(wrapper.emitted('syncCleanContent')?.at(-1)?.[0]).toBe('# Intro\n')
  })

  test('emits the original markdown after undoing the first user edit', async () => {
    const wrapper = mount(
      defineComponent({
        components: { MilkdownHost, MilkdownProvider },
        data: () => ({ value: '# Intro' }),
        template: `
          <MilkdownProvider>
            <MilkdownHost
              :model-value="value"
              active-path="intro.md"
              @update:model-value="handleUpdate"
            />
          </MilkdownProvider>
        `,
        methods: {
          handleUpdate(value: string) {
            this.value = value
            this.$emit('update:modelValue', value)
          },
        },
      }),
    )

    await waitForEditorTimers()
    const view = getEditorView(wrapper)

    const hostRoot = wrapper.get('.milkdown-host-root')

    dispatchUserKey(hostRoot.element, 'x')
    view.dispatch((view.state as any).tr.insertText(' changed', textEndPosition(view, 'Intro')))
    await waitForEditorTimers()

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('# Intro changed\n')

    dispatchUserKey(hostRoot.element, 'z', { ctrlKey: true })
    const undone = undo(view.state as any, view.dispatch as any)
    expect(undone).toBe(true)
    await waitForEditorTimers()

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('# Intro\n')
  })

  test('emits the original markdown when Ctrl+Z undoes a single-space edit', async () => {
    const wrapper = mount(
      defineComponent({
        components: { MilkdownHost, MilkdownProvider },
        data: () => ({ value: '# Intro' }),
        template: `
          <MilkdownProvider>
            <MilkdownHost
              :model-value="value"
              active-path="intro.md"
              @update:model-value="handleUpdate"
            />
          </MilkdownProvider>
        `,
        methods: {
          handleUpdate(value: string) {
            this.value = value
            this.$emit('update:modelValue', value)
          },
        },
      }),
    )

    await waitForEditorTimers()
    const view = getEditorView(wrapper)
    const editorRoot = wrapper.get('.ProseMirror')

    dispatchUserKey(editorRoot.element, ' ')
    view.dispatch((view.state as any).tr.insertText(' ', textEndPosition(view, 'Intro')))
    await waitForEditorTimers()
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('# Intro \n')

    const undoEvent = dispatchUserKey(editorRoot.element, 'z', { ctrlKey: true })
    expect(undoEvent.defaultPrevented).toBe(true)
    await waitForEditorTimers()

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('# Intro\n')
  })

  test('emits the original markdown after undoing a single-space edit', async () => {
    const wrapper = mount(
      defineComponent({
        components: { MilkdownHost, MilkdownProvider },
        data: () => ({ value: '# Intro' }),
        template: `
          <MilkdownProvider>
            <MilkdownHost
              :model-value="value"
              active-path="intro.md"
              @update:model-value="handleUpdate"
            />
          </MilkdownProvider>
        `,
        methods: {
          handleUpdate(value: string) {
            this.value = value
            this.$emit('update:modelValue', value)
          },
        },
      }),
    )

    await waitForEditorTimers()
    const view = getEditorView(wrapper)
    const hostRoot = wrapper.get('.milkdown-host-root')

    dispatchUserKey(hostRoot.element, ' ')
    view.dispatch((view.state as any).tr.insertText(' ', textEndPosition(view, 'Intro')))
    await waitForEditorTimers()

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('# Intro \n')

    dispatchUserKey(hostRoot.element, 'z', { ctrlKey: true })
    const undone = undo(view.state as any, view.dispatch as any)
    expect(undone).toBe(true)
    await waitForEditorTimers()

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('# Intro\n')
  })

  test('does not emit dirty markdown after immediately undoing a single-space edit', async () => {
    const wrapper = mount(
      defineComponent({
        components: { MilkdownHost, MilkdownProvider },
        data: () => ({ value: '# Intro' }),
        template: `
          <MilkdownProvider>
            <MilkdownHost
              :model-value="value"
              active-path="intro.md"
              @update:model-value="handleUpdate"
            />
          </MilkdownProvider>
        `,
        methods: {
          handleUpdate(value: string) {
            this.value = value
            this.$emit('update:modelValue', value)
          },
        },
      }),
    )

    await waitForEditorTimers()
    const view = getEditorView(wrapper)
    const hostRoot = wrapper.get('.milkdown-host-root')

    dispatchUserKey(hostRoot.element, ' ')
    view.dispatch((view.state as any).tr.insertText(' ', textEndPosition(view, 'Intro')))
    dispatchUserKey(hostRoot.element, 'z', { ctrlKey: true })
    const undone = undo(view.state as any, view.dispatch as any)
    expect(undone).toBe(true)
    await waitForEditorTimers()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
