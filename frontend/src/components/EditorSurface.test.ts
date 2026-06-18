import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import EditorSurface from './EditorSurface.vue'

vi.mock('./MilkdownEditor.vue', () => ({
  default: defineComponent({
    name: 'MilkdownEditor',
    props: {
      modelValue: { type: String, required: true },
      activePath: { type: String, required: true },
    },
    emits: ['update:modelValue'],
    template: `
      <div class="mock-milkdown">
        <textarea
          data-test="mock-editor"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
        />
      </div>
    `,
  }),
}))

const document = {
  path: 'draft.md',
  name: 'draft.md',
  content: '# Draft',
  savedContent: '# Draft',
  saving: false,
  error: '',
}

describe('EditorSurface', () => {
  test('renders the document title and emits rename and delete actions', async () => {
    const wrapper = mount(EditorSurface, {
      props: {
        document,
        modelValue: '# Draft',
      },
    })

    expect(wrapper.text()).toContain('当前笔记')
    expect(wrapper.text()).toContain('draft.md')

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('rename')?.length).toBe(1)
    expect(wrapper.emitted('delete')?.length).toBe(1)
  })

  test('renders MilkdownEditor without duplicate shell wrappers and forwards model updates', async () => {
    const wrapper = mount(EditorSurface, {
      props: {
        document,
        modelValue: '# Draft',
      },
    })

    expect(wrapper.find('.milkdown-shell').exists()).toBe(false)
    expect(wrapper.find('.milkdown-editor').exists()).toBe(false)

    await wrapper.get('[data-test="mock-editor"]').setValue('# Revised')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['# Revised'])
  })

  test('renders an empty state without workspace management buttons', () => {
    const wrapper = mount(EditorSurface, {
      props: {
        document: null,
        modelValue: '',
      },
    })

    expect(wrapper.text()).toContain('选择一个笔记文件夹开始写作')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.emitted('open-workspace')).toBeUndefined()
  })
})
