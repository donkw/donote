import { createDiscreteApi, darkTheme } from 'naive-ui'
import { computed, type Ref } from 'vue'
import { createNaiveThemeOverrides } from './naiveTheme'
import type { ThemeMode } from './theme'

export type ConfirmType = 'default' | 'warning' | 'error'

export type ConfirmOptions = {
  title: string
  content: string
  positiveText: string
  negativeText: string
  type?: ConfirmType
}

export type PromptOptions = {
  title: string
  initialValue: string
  positiveText: string
  negativeText: string
}

export type PromptHandler = (options: PromptOptions) => Promise<string | null>

export type AppFeedback = {
  confirm(options: ConfirmOptions): Promise<void>
  prompt(options: PromptOptions): Promise<string | null>
  error(message: string): void
  destroy(): void
}

export function createAppFeedback(theme: Ref<ThemeMode>, prompt: PromptHandler): AppFeedback {
  const { message, dialog, unmount } = createDiscreteApi(['message', 'dialog'], {
    configProviderProps: computed(() => ({
      theme: theme.value === 'dark' ? darkTheme : null,
      themeOverrides: createNaiveThemeOverrides(theme.value),
    })),
  })
  let destroyed = false

  return {
    confirm(options) {
      return new Promise<void>((resolve, reject) => {
        let settled = false
        const settle = (next: () => void) => {
          if (settled) {
            return
          }
          settled = true
          next()
        }
        const cancel = () => {
          settle(() => {
            reject(new Error('cancelled'))
          })
        }
        const createDialog = options.type === 'error' ? dialog.error : dialog.warning
        createDialog({
          title: options.title,
          content: options.content,
          positiveText: options.positiveText,
          negativeText: options.negativeText,
          maskClosable: false,
          closeOnEsc: false,
          onPositiveClick: () => {
            settle(resolve)
          },
          onNegativeClick: cancel,
          onClose: cancel,
        })
      })
    },
    prompt,
    error(messageText) {
      message.error(messageText)
    },
    destroy() {
      if (destroyed) {
        return
      }
      destroyed = true
      unmount()
    },
  }
}
