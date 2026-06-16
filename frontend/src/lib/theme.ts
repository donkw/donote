export type ThemeMode = 'light' | 'dark'

export const themeStorageKey = 'donote.theme'

export function getInitialTheme(storage: Storage | undefined = window.localStorage): ThemeMode {
  const stored = storage?.getItem(themeStorageKey)
  return stored === 'dark' ? 'dark' : 'light'
}

export function applyTheme(
  mode: ThemeMode,
  storage: Storage | undefined = window.localStorage,
  root: HTMLElement = document.documentElement,
): ThemeMode {
  root.dataset.theme = mode
  storage?.setItem(themeStorageKey, mode)
  return mode
}

export function toggleTheme(
  current: ThemeMode,
  storage: Storage | undefined = window.localStorage,
  root: HTMLElement = document.documentElement,
): ThemeMode {
  return applyTheme(current === 'dark' ? 'light' : 'dark', storage, root)
}
