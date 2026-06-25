import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import SearchPanel from './SearchPanel.vue'

const searchResult = {
  query: 'Intro',
  matches: [
    { start: 0, end: 5 },
    { start: 12, end: 17 },
  ],
}

describe('SearchPanel', () => {
  test('emits close from the right-side close button', async () => {
    const wrapper = mount(SearchPanel, {
      props: {
        query: 'Intro',
        result: searchResult,
        activeIndex: 0,
      },
    })

    expect(wrapper.get('[data-test="search-close"]').attributes('aria-label')).toBe('关闭搜索')
    expect(wrapper.find('.search-actions [data-test="search-close"]').exists()).toBe(false)
    expect(
      wrapper
        .findAll('.search-panel > *')
        .at(-1)
        ?.attributes('data-test'),
    ).toBe('search-close')

    await wrapper.get('[data-test="search-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('disables previous and next buttons when there are no matches', () => {
    const wrapper = mount(SearchPanel, {
      props: {
        query: 'missing',
        result: {
          query: 'missing',
          matches: [],
        },
        activeIndex: -1,
      },
    })

    expect(wrapper.get('[data-test="search-previous"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="search-next"]').attributes('disabled')).toBeDefined()
  })

  test('uses Naive button chrome for search actions', () => {
    const wrapper = mount(SearchPanel, {
      props: {
        query: 'Intro',
        result: searchResult,
        activeIndex: 0,
      },
    })

    expect(wrapper.get('[data-test="search-previous"]').classes()).toContain('n-button')
    expect(wrapper.get('[data-test="search-next"]').classes()).toContain('n-button')
    expect(wrapper.get('[data-test="search-close"]').classes()).toContain('n-button')
  })
})
