import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import CommandToolbar from './CommandToolbar.vue'

describe('CommandToolbar', () => {
  test('renders command workspace controls and emits actions', async () => {
    const wrapper = mount(CommandToolbar, {
      props: {
        activePanel: 'outline',
        drawerOpen: false,
        sidebarOpen: true,
        searchOpen: false,
        theme: 'dark',
        saveState: 'dirty',
        workspaceName: 'notes',
        activeDocumentName: 'intro.md',
        openDocumentCount: 2,
      },
    })

    expect(wrapper.get('.command-brand__name').text()).toBe('Donote')
    expect(wrapper.get('[data-test="brand-mark"]').text()).toBe('D')
    expect(wrapper.get('[data-test="command-workspace-name"]').text()).toBe('notes')
    expect(wrapper.get('[data-test="command-active-document"]').text()).toBe('intro.md')
    expect(wrapper.get('[data-test="command-open-count"]').text()).toBe('2')
    expect(wrapper.get('[data-test="command-open-count"]').attributes('aria-label')).toBe(
      '打开文档数 2',
    )
    expect(wrapper.get('.command-status').text()).toBe('未保存')
    expect(wrapper.get('.command-status').attributes('role')).toBe('status')
    expect(wrapper.get('.command-status').attributes('aria-live')).toBe('polite')
    expect(wrapper.get('[data-test="brand-mark"]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.command-center-button').exists()).toBe(false)
    expect(wrapper.get('[data-test="utility-search"]').classes()).toContain('n-button')
    expect(wrapper.get('[data-test="utility-search"]').classes()).toContain('command-button')
    expect(wrapper.get('[data-test="save-now"]').attributes('aria-pressed')).toBeUndefined()
    const actionOrder = wrapper
      .find('.command-actions')
      .findAll('[data-test]')
      .map((item) => item.attributes('data-test'))
    expect(actionOrder.indexOf('utility-search')).toBe(actionOrder.indexOf('save-now') - 1)

    await wrapper.get('[data-test="create-note"]').trigger('click')
    expect(wrapper.emitted('create-note')).toHaveLength(1)
    await wrapper.get('[data-test="toggle-sidebar"]').trigger('click')
    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await wrapper.get('[data-test="save-now"]').trigger('click')
    await wrapper.get('[data-test="utility-settings"]').trigger('click')
    await wrapper.get('[data-test="theme-toggle"]').trigger('click')

    expect(wrapper.emitted('toggle-sidebar')).toHaveLength(1)
    expect(wrapper.emitted('search')).toHaveLength(1)
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('select')?.[0]).toEqual(['settings'])
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1)
  })

  test('keeps icon controls accessible and disables save while saving', async () => {
    const wrapper = mount(CommandToolbar, {
      props: {
        activePanel: 'outline',
        drawerOpen: true,
        sidebarOpen: false,
        searchOpen: true,
        theme: 'light',
        saveState: 'saving',
        workspaceName: '',
        activeDocumentName: '',
        openDocumentCount: 0,
      },
    })

    expect(wrapper.get('[data-test="toggle-sidebar"]').attributes('aria-label')).toBe('显示目录栏')
    expect(wrapper.get('[data-test="utility-search"]').attributes('aria-label')).toBe('搜索')
    expect(wrapper.get('[data-test="utility-search"]').text()).toBe('')
    expect(wrapper.get('[data-test="utility-outline"]').attributes('aria-label')).toBe('大纲')
    expect(wrapper.get('[data-test="utility-settings"]').attributes('aria-label')).toBe('设置')
    expect(wrapper.get('[data-test="theme-toggle"]').attributes('aria-label')).toBe('切换深色')
    expect(wrapper.get('[data-test="save-now"]').attributes('aria-label')).toBe('立即保存')
    expect(wrapper.get('[data-test="save-now"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="utility-outline"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="utility-outline"]').classes()).toContain(
      'command-button--active',
    )

    await wrapper.get('[data-test="save-now"]').trigger('click')

    expect(wrapper.emitted('save')).toBeUndefined()
  })
})
