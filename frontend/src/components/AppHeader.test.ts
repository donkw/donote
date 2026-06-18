import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import AppHeader from './AppHeader.vue'

describe('AppHeader', () => {
  test('renders brand, save status, and window actions without format toolbar', () => {
    const wrapper = mount(AppHeader, {
      props: {
        theme: 'light',
        saveStatusText: '有未保存更改',
        saveState: 'dirty',
      },
    })

    expect(wrapper.text()).toContain('Donote')
    expect(wrapper.text()).toContain('有未保存更改')
    expect(wrapper.find('[data-test="sidebar-toggle"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="format-toolbar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="format-table"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="outline-toggle"]').exists()).toBe(false)
    expect(wrapper.get('.save-status').attributes('data-state')).toBe('dirty')
  })

  test('emits search and settings intents from toolbar buttons', async () => {
    const wrapper = mount(AppHeader, {
      props: {
        theme: 'dark',
        saveStatusText: '已保存',
        saveState: 'saved',
      },
    })

    await wrapper.get('[data-test="settings-toggle"]').trigger('click')
    await wrapper.get('[data-test="search-toggle"]').trigger('click')
    await wrapper.get('[data-test="save-now"]').trigger('click')
    await wrapper.get('[data-test="theme-toggle"]').trigger('click')

    expect(wrapper.emitted('toggle-sidebar')).toBeUndefined()
    expect(wrapper.emitted('insert-markdown')).toBeUndefined()
    expect(wrapper.emitted('settings')).toHaveLength(1)
    expect(wrapper.emitted('search')).toHaveLength(1)
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1)
  })
})
