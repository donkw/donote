import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import MilkdownHost from './MilkdownHost.vue'

vi.mock('@milkdown/vue', () => ({
  Milkdown: {
    name: 'Milkdown',
    template:
      '<div data-test="milkdown"><img alt="local" src="../assets/photo.png" /><img alt="remote" src="https://example.com/photo.png" /></div>',
  },
  useEditor: () => ({
    get: () => ({
      action: vi.fn(),
    }),
  }),
}))

async function waitForAssertion(assertion: () => void) {
  let lastError: unknown
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => window.setTimeout(resolve, 10))
      await flushPromises()
    }
  }
  throw lastError
}

describe('MilkdownHost', () => {
  test('resolves relative workspace image sources for display', async () => {
    const resolveImageSource = vi.fn().mockResolvedValue('data:image/png;base64,aW1hZ2U=')

    const wrapper = mount(MilkdownHost, {
      props: {
        modelValue: '![local](../assets/photo.png)',
        activePath: 'notes/intro.md',
        resolveImageSource,
      },
    })

    await waitForAssertion(() => {
      expect(resolveImageSource).toHaveBeenCalledWith('../assets/photo.png', 'notes/intro.md')
    })

    const localImage = wrapper.get('img[alt="local"]').element as HTMLImageElement
    const remoteImage = wrapper.get('img[alt="remote"]').element as HTMLImageElement

    expect(localImage.getAttribute('src')).toBe('data:image/png;base64,aW1hZ2U=')
    expect(remoteImage.getAttribute('src')).toBe('https://example.com/photo.png')
    expect(resolveImageSource).toHaveBeenCalledTimes(1)
  })
})
