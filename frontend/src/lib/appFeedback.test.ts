import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import { createAppFeedback } from './appFeedback'

const naiveMocks = vi.hoisted(() => {
  const capturedDialogs = {
    warning: [] as Array<Record<string, unknown>>,
    error: [] as Array<Record<string, unknown>>,
  }
  const dialog = {
    warning: vi.fn((options: Record<string, unknown>) => {
      capturedDialogs.warning.push(options)
      return {}
    }),
    error: vi.fn((options: Record<string, unknown>) => {
      capturedDialogs.error.push(options)
      return {}
    }),
  }
  const message = {
    error: vi.fn(),
  }

  return {
    capturedDialogs,
    createDiscreteApi: vi.fn(() => ({ dialog, message })),
    darkTheme: { name: 'dark' },
    dialog,
    message,
  }
})

vi.mock('naive-ui', () => ({
  createDiscreteApi: naiveMocks.createDiscreteApi,
  darkTheme: naiveMocks.darkTheme,
}))

function createConfirmOptions() {
  return {
    title: 'Delete note',
    content: 'This cannot be undone.',
    positiveText: 'Delete',
    negativeText: 'Cancel',
  }
}

describe('createAppFeedback', () => {
  beforeEach(() => {
    naiveMocks.capturedDialogs.warning.length = 0
    naiveMocks.capturedDialogs.error.length = 0
    naiveMocks.createDiscreteApi.mockClear()
    naiveMocks.dialog.warning.mockClear()
    naiveMocks.dialog.error.mockClear()
    naiveMocks.message.error.mockClear()
  })

  test('confirm disables implicit mask and escape dismissal', async () => {
    const feedback = createAppFeedback(ref('light'), vi.fn())

    const confirmPromise = feedback.confirm(createConfirmOptions())
    const dialogOptions = naiveMocks.capturedDialogs.warning[0]

    expect(dialogOptions).toMatchObject({
      maskClosable: false,
      closeOnEsc: false,
    })
    ;(dialogOptions.onClose as () => void)()

    await expect(confirmPromise).rejects.toThrow('cancelled')
  })

  test('confirm resolves on positive click and rejects on negative click', async () => {
    const feedback = createAppFeedback(ref('light'), vi.fn())

    const positivePromise = feedback.confirm(createConfirmOptions())
    const positiveDialog = naiveMocks.capturedDialogs.warning[0]
    ;(positiveDialog.onPositiveClick as () => void)()

    await expect(positivePromise).resolves.toBeUndefined()

    const negativePromise = feedback.confirm(createConfirmOptions())
    const negativeDialog = naiveMocks.capturedDialogs.warning[1]
    ;(negativeDialog.onNegativeClick as () => void)()

    await expect(negativePromise).rejects.toThrow('cancelled')
  })
})
