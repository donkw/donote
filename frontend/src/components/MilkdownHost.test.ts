import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import MilkdownHost from './MilkdownHost.vue'

vi.mock('@milkdown/vue', () => ({
  Milkdown: {
    name: 'Milkdown',
    template:
      '<div data-test="milkdown"><img alt="local" src="../assets/photo.png" title="donote-width=220" /><img alt="remote" src="https://example.com/photo.png" /></div>',
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

function dispatchPointerEvent(
  target: EventTarget,
  type: string,
  options: { clientX: number; pointerId?: number; button?: number },
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clientX', { value: options.clientX })
  Object.defineProperty(event, 'pointerId', { value: options.pointerId ?? 1 })
  Object.defineProperty(event, 'button', { value: options.button ?? 0 })
  target.dispatchEvent(event)
}

function mockRect(element: Element, rect: Partial<DOMRect>) {
  element.getBoundingClientRect = vi.fn(
    () =>
      ({
        x: rect.left ?? 0,
        y: rect.top ?? 0,
        left: rect.left ?? 0,
        top: rect.top ?? 0,
        right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
        bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        toJSON: () => ({}),
      }) as DOMRect,
  )
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
    expect(localImage.style.width).toBe('220px')
    expect(localImage.getAttribute('title')).toBeNull()
    expect(remoteImage.getAttribute('src')).toBe('https://example.com/photo.png')
    expect(resolveImageSource).toHaveBeenCalledTimes(1)
  })

  test('resizes images by dragging the handle and persists width in markdown', async () => {
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
    mockRect(wrapper.element, { left: 0, top: 0, width: 600, height: 400 })
    mockRect(localImage, { left: 20, top: 30, right: 220, bottom: 130, width: 200, height: 100 })

    dispatchPointerEvent(localImage, 'pointerdown', { clientX: 220 })
    const handle = wrapper.get('[data-test="image-resize-handle"]')
    dispatchPointerEvent(handle.element, 'pointerdown', { clientX: 220 })
    dispatchPointerEvent(window, 'pointermove', { clientX: 280 })
    dispatchPointerEvent(window, 'pointerup', { clientX: 280 })

    expect(localImage.style.width).toBe('260px')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(
      '![local](../assets/photo.png "donote-width=260")',
    )
  })
})
