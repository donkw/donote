import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import UtilityRail from './UtilityRail.vue'

describe('UtilityRail', () => {
  test('renders utility buttons and emits selected panel', async () => {
    const wrapper = mount(UtilityRail, {
      props: {
        activePanel: 'outline',
        drawerOpen: false,
        searchOpen: false,
        theme: 'light',
        saveState: 'dirty',
      },
    })

    expect(
      wrapper.findAll('.utility-rail [data-test]').map((item) => item.attributes('data-test')),
    ).toEqual(['theme-toggle', 'save-now', 'utility-outline', 'utility-search', 'utility-settings'])

    await wrapper.get('[data-test="theme-toggle"]').trigger('click')
    await wrapper.get('[data-test="save-now"]').trigger('click')
    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await wrapper.get('[data-test="utility-settings"]').trigger('click')

    expect(wrapper.emitted('toggle-theme')).toHaveLength(1)
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('search')).toHaveLength(1)
    expect(wrapper.emitted('select')?.[0]).toEqual(['settings'])
  })

  test('adds accessible names to icon-only utility buttons', () => {
    const wrapper = mount(UtilityRail, {
      props: {
        activePanel: 'outline',
        drawerOpen: true,
        searchOpen: true,
        theme: 'dark',
        saveState: 'saved',
      },
    })

    expect(wrapper.get('[data-test="theme-toggle"]').attributes('aria-label')).toBe('切换浅色')
    expect(wrapper.get('[data-test="save-now"]').attributes('aria-label')).toBe('立即保存')
    expect(wrapper.get('[data-test="utility-outline"]').attributes('aria-label')).toBe('大纲')
    expect(wrapper.get('[data-test="utility-search"]').attributes('aria-label')).toBe('搜索')
    expect(wrapper.get('[data-test="utility-settings"]').attributes('title')).toBe('设置')
  })

  test('disables save while saving', () => {
    const wrapper = mount(UtilityRail, {
      props: {
        activePanel: 'outline',
        drawerOpen: false,
        searchOpen: false,
        theme: 'light',
        saveState: 'saving',
      },
    })

    expect(wrapper.get('[data-test="save-now"]').attributes('disabled')).toBeDefined()
  })
})
