import { flushPromises, mount } from '@vue/test-utils'
import { MilkdownProvider } from '@milkdown/vue'
import { defineComponent } from 'vue'
import { describe, expect, test } from 'vitest'
import MilkdownHost from './MilkdownHost.vue'

async function waitForEditorTimers() {
  await new Promise((resolve) => window.setTimeout(resolve, 500))
  await flushPromises()
}

describe('MilkdownHost integration', () => {
  test('does not emit editor-generated markdown normalization before the user edits', async () => {
    const wrapper = mount(
      defineComponent({
        components: { MilkdownHost, MilkdownProvider },
        template: `
          <MilkdownProvider>
            <MilkdownHost
              model-value="# Intro\n\n* item"
              active-path="intro.md"
              @update:model-value="handleUpdate"
            />
          </MilkdownProvider>
        `,
        methods: {
          handleUpdate(value: string) {
            this.$emit('update:modelValue', value)
          },
        },
      }),
    )

    await waitForEditorTimers()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
