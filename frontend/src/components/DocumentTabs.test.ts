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
    const activeTab = wrapper.get('[data-test="tab-draft.md"]')
    const inactiveTab = wrapper.get('[data-test="tab-intro.md"]')
    const dirtyMark = wrapper.get('[data-test="tab-draft.md"] .dirty-mark')

    expect(activeTab.attributes('aria-selected')).toBe('true')
    expect(inactiveTab.attributes('aria-selected')).toBe('false')
    expect(dirtyMark.text()).toBe('*')
    expect(dirtyMark.attributes('aria-label')).toBe('未保存')
    expect(wrapper.find('[data-test="tab-intro.md"] .dirty-mark').exists()).toBe(false)
  })

  test('renders Donote tab structure and active tab state', () => {
    const wrapper = mount(DocumentTabs, {
      props: {
        documents,
        activePath: 'draft.md',
      },
    })

    expect(wrapper.get('.document-tabs').attributes('role')).toBe('tablist')
    expect(wrapper.get('.document-tabs').attributes('aria-label')).toBe('打开的笔记')
    expect(wrapper.get('.document-tabs__track').attributes('role')).toBe('presentation')
    expect(wrapper.get('.document-tabs__list').attributes('role')).toBe('presentation')
    expect(wrapper.findAll('.document-tab')).toHaveLength(documents.length)
    expect(wrapper.find('.document-tab.active').exists()).toBe(true)
  })

  test('emits switch events when tab trigger is clicked', async () => {
    const wrapper = mount(DocumentTabs, {
      props: {
        documents,
        activePath: 'intro.md',
      },
    })

    await wrapper.get('[data-test="tab-draft.md"]').trigger('click')

    expect(wrapper.emitted('update:activePath')?.[0]).toEqual(['draft.md'])
  })

  test('emits switch events for standard tablist keyboard navigation', async () => {
    const cases = [
      { key: 'ArrowRight', activePath: 'intro.md', targetPath: 'draft.md' },
      { key: 'ArrowDown', activePath: 'intro.md', targetPath: 'draft.md' },
      { key: 'ArrowLeft', activePath: 'intro.md', targetPath: 'draft.md' },
      { key: 'ArrowUp', activePath: 'intro.md', targetPath: 'draft.md' },
      { key: 'Home', activePath: 'draft.md', targetPath: 'intro.md' },
      { key: 'End', activePath: 'intro.md', targetPath: 'draft.md' },
    ]

    for (const { key, activePath, targetPath } of cases) {
      const wrapper = mount(DocumentTabs, {
        props: {
          documents,
          activePath,
        },
      })

      await wrapper.get(`[data-test="tab-${activePath}"]`).trigger('keydown', { key })

      expect(wrapper.emitted('update:activePath')?.[0], key).toEqual([targetPath])
    }
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

  test('does not nest buttons inside document tab controls', () => {
    const wrapper = mount(DocumentTabs, {
      props: {
        documents,
        activePath: 'draft.md',
      },
    })

    const tabs = wrapper.findAll('.document-tab')

    expect(tabs).toHaveLength(documents.length)
    for (const tab of tabs) {
      expect(tab.find('button button').exists()).toBe(false)
    }
  })
})
