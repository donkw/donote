import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import CommandToolbar from './CommandToolbar.vue'

describe('CommandToolbar', () => {
  test('renders command workspace controls and emits actions', async () => {
    const wrapper = mount(CommandToolbar, {
      props: {
        activePanel: 'outline',
        drawerOpen: false,
        searchOpen: false,
        theme: 'dark',
        saveState: 'dirty',
      },
    })

    expect(wrapper.get('.command-brand__name').text()).toBe('DoNote')
    expect(wrapper.find('.command-brand__meta').exists()).toBe(false)
    expect(wrapper.find('[data-test="command-workspace-name"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="command-active-document"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="command-workspace-root"]').exists()).toBe(false)
    expect(wrapper.find('.command-actions__ghost').exists()).toBe(false)
    expect(wrapper.find('.command-status').exists()).toBe(false)
    expect(wrapper.find('[data-test="command-open-count"]').exists()).toBe(false)
    expect(wrapper.find('.command-count').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('未保存')
    expect(wrapper.find('.command-center-button').exists()).toBe(false)
    expect(wrapper.get('[data-test="utility-search"]').classes()).toContain('el-button')
    expect(wrapper.get('[data-test="save-now"]').classes()).not.toContain('el-button--primary')
    const actionOrder = wrapper
      .find('.command-actions')
      .findAll('[data-test]')
      .map((item) => item.attributes('data-test'))
    expect(actionOrder.indexOf('utility-search')).toBe(actionOrder.indexOf('save-now') - 1)

    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await wrapper.get('[data-test="save-now"]').trigger('click')
    await wrapper.get('[data-test="utility-settings"]').trigger('click')
    await wrapper.get('[data-test="theme-toggle"]').trigger('click')

    expect(wrapper.emitted('search')).toHaveLength(1)
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('select')?.[0]).toEqual(['settings'])
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1)
  })

  test('keeps icon controls accessible and disables save while saving', () => {
    const wrapper = mount(CommandToolbar, {
      props: {
        activePanel: 'outline',
        drawerOpen: true,
        searchOpen: true,
        theme: 'light',
        saveState: 'saving',
      },
    })

    expect(wrapper.get('[data-test="utility-search"]').attributes('aria-label')).toBe('搜索')
    expect(wrapper.get('[data-test="utility-search"]').text()).toBe('')
    expect(wrapper.get('[data-test="utility-outline"]').attributes('aria-label')).toBe('大纲')
    expect(wrapper.get('[data-test="utility-settings"]').attributes('aria-label')).toBe('设置')
    expect(wrapper.get('[data-test="theme-toggle"]').attributes('aria-label')).toBe('切换深色')
    expect(wrapper.get('[data-test="save-now"]').attributes('aria-label')).toBe('立即保存')
    expect(wrapper.get('[data-test="save-now"]').attributes('disabled')).toBeDefined()
  })
})
