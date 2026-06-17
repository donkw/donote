import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import UtilityRail from './UtilityRail.vue'

describe('UtilityRail', () => {
  test('renders utility buttons and emits selected panel', async () => {
    const wrapper = mount(UtilityRail, {
      props: {
        activePanel: 'outline',
        drawerOpen: false,
      },
    })

    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await wrapper.get('[data-test="utility-settings"]').trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual(['search'])
    expect(wrapper.emitted('select')?.[1]).toEqual(['settings'])
  })

  test('adds accessible names to icon-only utility buttons', () => {
    const wrapper = mount(UtilityRail, {
      props: {
        activePanel: 'outline',
        drawerOpen: true,
      },
    })

    expect(wrapper.get('[data-test="utility-outline"]').attributes('aria-label')).toBe('大纲')
    expect(wrapper.get('[data-test="utility-search"]').attributes('aria-label')).toBe('搜索')
    expect(wrapper.get('[data-test="utility-settings"]').attributes('title')).toBe('设置')
  })
})
