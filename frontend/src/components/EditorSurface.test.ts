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
      resolveImageSource: { type: Function, default: undefined },
      searchQuery: { type: String, default: '' },
      activeSearchIndex: { type: Number, default: -1 },
    },
    emits: ['update:modelValue', 'paste-files', 'insert-markdown'],
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
  test('hides the editor toolbar text and action buttons', () => {
    const wrapper = mount(EditorSurface, {
      props: {
        document,
        modelValue: '# Draft',
      },
    })

    expect(wrapper.find('.document-heading').exists()).toBe(false)
    expect(wrapper.find('.document-label').exists()).toBe(false)
    expect(wrapper.find('.document-toolbar').exists()).toBe(false)
    expect(wrapper.find('.document-actions').exists()).toBe(false)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('当前笔记')
    expect(wrapper.text()).not.toContain('draft.md')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.emitted('rename')).toBeUndefined()
    expect(wrapper.emitted('delete')).toBeUndefined()
  })

  test('renders MilkdownEditor without duplicate shell wrappers and forwards model updates', async () => {
    const wrapper = mount(EditorSurface, {
      props: {
        document,
        modelValue: '# Draft',
        searchQuery: 'Draft',
        activeSearchIndex: 0,
      },
    })

    expect(wrapper.find('.milkdown-shell').exists()).toBe(false)
    expect(wrapper.find('.milkdown-editor').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'MilkdownEditor' }).props('searchQuery')).toBe('Draft')
    expect(wrapper.findComponent({ name: 'MilkdownEditor' }).props('activeSearchIndex')).toBe(0)

    await wrapper.get('[data-test="mock-editor"]').setValue('# Revised')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['# Revised'])
  })

  test('forwards format toolbar insert events from the editor', () => {
    const wrapper = mount(EditorSurface, {
      props: {
        document,
        modelValue: '# Draft',
      },
    })

    wrapper.findComponent({ name: 'MilkdownEditor' }).vm.$emit('insert-markdown', '**加粗文本**')

    expect(wrapper.emitted('insert-markdown')?.[0]).toEqual(['**加粗文本**'])
  })

  test('offers a new note instead of reopening an already selected workspace', async () => {
    const wrapper = mount(EditorSurface, { props: { document: null, modelValue: '', workspaceOpen: true } })
    expect(wrapper.find('[data-test="empty-open-workspace"]').exists()).toBe(false)
    await wrapper.get('[data-test="empty-create-note"]').trigger('click')
    expect(wrapper.emitted('create-note')).toHaveLength(1)
  })

  test('renders an empty state with a workspace action', async () => {
    const wrapper = mount(EditorSurface, {
      props: {
        document: null,
        modelValue: '',
      },
    })

    expect(wrapper.text()).toContain('选择一个笔记文件夹开始写作')
    expect(wrapper.get('[data-test="empty-open-workspace"]').text()).toBe('打开笔记文件夹')
    expect(wrapper.find('.n-empty').exists()).toBe(true)
    await wrapper.get('[data-test="empty-open-workspace"]').trigger('click')
    expect(wrapper.emitted('open-workspace')).toHaveLength(1)
  })
})
