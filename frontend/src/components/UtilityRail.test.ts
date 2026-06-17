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
})
