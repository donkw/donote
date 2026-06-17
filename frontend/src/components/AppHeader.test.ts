import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import AppHeader from './AppHeader.vue'

describe('AppHeader', () => {
  test('renders brand, save status, and format actions', () => {
    const wrapper = mount(AppHeader, {
      props: {
        showSidebar: true,
        theme: 'light',
        saveStatusText: '有未保存更改',
        saveState: 'dirty',
      },
    })

    expect(wrapper.text()).toContain('Donote')
    expect(wrapper.text()).toContain('有未保存更改')
    expect(wrapper.find('[data-test="format-toolbar"]').exists()).toBe(true)
  })

  test('emits user intents from toolbar buttons', async () => {
    const wrapper = mount(AppHeader, {
      props: {
        showSidebar: false,
        theme: 'dark',
        saveStatusText: '已保存',
        saveState: 'saved',
      },
    })

    await wrapper.get('[data-test="sidebar-toggle"]').trigger('click')
    await wrapper.get('[data-test="format-heading"]').trigger('click')
    await wrapper.get('[data-test="save-now"]').trigger('click')
    await wrapper.get('[data-test="theme-toggle"]').trigger('click')

    expect(wrapper.emitted('toggle-sidebar')).toHaveLength(1)
    expect(wrapper.emitted('insert-markdown')?.[0]).toEqual(['# 标题'])
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1)
  })
})
