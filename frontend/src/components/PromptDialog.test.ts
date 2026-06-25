import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import PromptDialog from './PromptDialog.vue'
import type { PromptOptions } from '../lib/appFeedback'

type PromptDialogExpose = {
  requestPrompt(options: PromptOptions): Promise<string | null>
}

const promptOptions: PromptOptions = {
  title: 'Rename note',
  initialValue: 'old.md',
  positiveText: 'Rename',
  negativeText: 'Cancel',
}

vi.mock('naive-ui', async () => {
  const { defineComponent, h, ref } = await vi.importActual<typeof import('vue')>(
    'vue',
  )

  return {
    NModal: defineComponent({
      name: 'NModal',
      props: {
        show: { type: Boolean, default: false },
      },
      emits: ['update:show', 'after-leave'],
      setup(props, { slots }) {
        return () =>
          props.show
            ? h('div', [
                slots.default?.(),
                h('div', { class: 'modal-actions' }, slots.action?.()),
              ])
            : null
      },
    }),
    NInput: defineComponent({
      name: 'NInput',
      props: {
        value: { type: String, default: '' },
      },
      emits: ['update:value'],
      setup(props, { attrs, emit, expose }) {
        const inputRef = ref<HTMLInputElement | null>(null)
        expose({
          focus: () => inputRef.value?.focus(),
        })

        return () =>
          h('input', {
            ...attrs,
            ref: inputRef,
            value: props.value,
            onInput: (event: Event) => {
              emit('update:value', (event.target as HTMLInputElement).value)
            },
          })
      },
    }),
    NButton: defineComponent({
      name: 'NButton',
      setup(_, { attrs, slots }) {
        return () => h('button', attrs, slots.default?.())
      },
    }),
  }
})

function mountPromptDialog() {
  return mount(PromptDialog)
}

describe('PromptDialog', () => {
  test('settles the active prompt with null before replacing it', async () => {
    const wrapper = mountPromptDialog()
    const requestPrompt = (wrapper.vm as unknown as PromptDialogExpose).requestPrompt
    const firstResult = vi.fn()

    const first = requestPrompt(promptOptions)
    await flushPromises()
    first.then(firstResult)

    const second = requestPrompt({
      ...promptOptions,
      initialValue: 'second.md',
    })
    await flushPromises()

    expect(firstResult).toHaveBeenCalledWith(null)

    await wrapper.get('[data-test="prompt-input"]').setValue('renamed.md')
    await wrapper.get('[data-test="prompt-confirm"]').trigger('click')

    await expect(second).resolves.toBe('renamed.md')
    await expect(first).resolves.toBeNull()
  })

  test('cancel resolves the active prompt with null', async () => {
    const wrapper = mountPromptDialog()
    const requestPrompt = (wrapper.vm as unknown as PromptDialogExpose).requestPrompt

    const result = requestPrompt(promptOptions)
    await nextTick()

    await wrapper.get('[data-test="prompt-cancel"]').trigger('click')

    await expect(result).resolves.toBeNull()
  })
})
