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
}

export function createAppFeedback(theme: Ref<ThemeMode>, prompt: PromptHandler): AppFeedback {
  const { message, dialog } = createDiscreteApi(['message', 'dialog'], {
    configProviderProps: computed(() => ({
      theme: theme.value === 'dark' ? darkTheme : null,
      themeOverrides: createNaiveThemeOverrides(theme.value),
    })),
  })

  return {
    confirm(options) {
      return new Promise<void>((resolve, reject) => {
        const createDialog = options.type === 'error' ? dialog.error : dialog.warning
        createDialog({
          title: options.title,
          content: options.content,
          positiveText: options.positiveText,
          negativeText: options.negativeText,
          onPositiveClick: () => {
            resolve()
          },
          onNegativeClick: () => {
            reject(new Error('cancelled'))
          },
          onClose: () => {
            reject(new Error('cancelled'))
          },
        })
      })
    },
    prompt,
    error(messageText) {
      message.error(messageText)
    },
  }
}
