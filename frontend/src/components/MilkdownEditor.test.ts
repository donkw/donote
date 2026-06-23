import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import MilkdownEditor from './MilkdownEditor.vue'

vi.mock('@milkdown/vue', () => ({
  MilkdownProvider: defineComponent({
    name: 'MilkdownProvider',
    template: '<div data-test="milkdown-provider"><slot /></div>',
  }),
}))

vi.mock('./FormatToolbar.vue', () => ({
  default: defineComponent({
    name: 'FormatToolbar',
    props: {
      tooltipPlacement: { type: String, default: 'right' },
    },
    emits: ['insert-markdown'],
    template:
      '<button data-test="format-toolbar" type="button" @click="$emit(\'insert-markdown\', \'**加粗文本**\')">format</button>',
  }),
}))

vi.mock('./MilkdownHost.vue', () => ({
  default: defineComponent({
    name: 'MilkdownHost',
    props: {
      modelValue: { type: String, required: true },
      activePath: { type: String, required: true },
      resolveImageSource: { type: Function, default: undefined },
      searchQuery: { type: String, default: '' },
      activeSearchIndex: { type: Number, default: -1 },
    },
    emits: ['update:modelValue'],
    template:
      '<textarea data-test="milkdown-host" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
}))

describe('MilkdownEditor', () => {
  test('places the vertical format toolbar to the right of the editor', async () => {
    const wrapper = mount(MilkdownEditor, {
      props: {
        modelValue: '# Draft',
        activePath: 'draft.md',
      },
    })

    const shellChildren = wrapper.get('.milkdown-shell').element.children
    expect(Array.from(shellChildren[0].classList)).toContain('milkdown-editor')
    expect(shellChildren[1].getAttribute('data-test')).toBe('format-toolbar')
    expect(wrapper.getComponent({ name: 'FormatToolbar' }).props('tooltipPlacement')).toBe('left')

    await wrapper.get('[data-test="format-toolbar"]').trigger('click')

    expect(wrapper.emitted('insert-markdown')?.[0]).toEqual(['**加粗文本**'])
  })
})
