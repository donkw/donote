import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import SearchPanel from './SearchPanel.vue'

describe('SearchPanel', () => {
  test('emits close from the right-side close button', async () => {
    const wrapper = mount(SearchPanel, {
      props: {
        query: 'Intro',
        result: {
          query: 'Intro',
          matches: [
            { start: 0, end: 5 },
            { start: 12, end: 17 },
          ],
        },
        activeIndex: 0,
      },
    })

    expect(wrapper.get('[data-test="search-close"]').attributes('aria-label')).toBe('关闭搜索')

    await wrapper.get('[data-test="search-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
