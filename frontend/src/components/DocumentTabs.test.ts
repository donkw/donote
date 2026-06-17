import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import DocumentTabs from './DocumentTabs.vue'

const documents = [
  {
    path: 'intro.md',
    name: 'intro.md',
    content: '# Intro',
    savedContent: '# Intro',
    saving: false,
    error: '',
  },
  {
    path: 'draft.md',
    name: 'draft.md',
    content: '# Draft changed',
    savedContent: '# Draft',
    saving: false,
    error: '',
  },
]

describe('DocumentTabs', () => {
  test('renders active and dirty tabs', () => {
    const wrapper = mount(DocumentTabs, {
      props: {
        documents,
        activePath: 'draft.md',
      },
    })

    expect(wrapper.text()).toContain('intro.md')
    expect(wrapper.text()).toContain('draft.md')
    expect(wrapper.get('[data-test="tab-draft.md"] .dirty-mark').text()).toBe('*')
    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(false)
  })

  test('emits switch events when tabs change', async () => {
    const wrapper = mount(DocumentTabs, {
      props: {
        documents,
        activePath: 'intro.md',
      },
    })

    wrapper.findComponent({ name: 'ElTabs' }).vm.$emit('update:modelValue', 'draft.md')

    expect(wrapper.emitted('update:activePath')?.[0]).toEqual(['draft.md'])
  })

  test('clicking close emits close for that document without switching tabs', async () => {
    const wrapper = mount(DocumentTabs, {
      props: {
        documents,
        activePath: 'intro.md',
      },
    })

    await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')

    expect(wrapper.emitted('close')?.[0]).toEqual([documents[0]])
    expect(wrapper.emitted('update:activePath')).toBeUndefined()
  })
})
