import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import FormatToolbar from './FormatToolbar.vue'

describe('FormatToolbar', () => {
  test('renders vertical format actions and emits markdown snippets', async () => {
    const wrapper = mount(FormatToolbar)

    expect(wrapper.get('[data-test="format-toolbar"]').classes()).toContain(
      'format-toolbar--vertical',
    )
    expect(wrapper.find('[data-test="format-table"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="format-heading"]').classes()).toContain('n-button')
    expect(wrapper.get('[data-test="format-heading"]').attributes('aria-label')).toBe(
      '标题',
    )
    expect(wrapper.get('[data-test="format-heading"]').attributes('title')).toBe('标题')

    await wrapper.get('[data-test="format-heading"]').trigger('click')
    await wrapper.get('[data-test="format-table"]').trigger('click')

    expect(wrapper.emitted('insert-markdown')?.[0]).toEqual(['# 标题'])
    expect(wrapper.emitted('insert-markdown')?.[1]).toEqual([
      '| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |',
    ])
  })
})
