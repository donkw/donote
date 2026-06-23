import { describe, expect, test } from 'vitest'
import { applyTheme, getInitialTheme, toggleTheme, type ThemeMode } from './theme'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  length = 0

  clear(): void {
    this.values.clear()
    this.length = 0
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
    this.length = this.values.size
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
    this.length = this.values.size
  }
}

describe('theme helpers', () => {
  test('reads persisted dark or light theme and defaults to dark command workspace', () => {
    const storage = new MemoryStorage()

    expect(getInitialTheme(storage)).toBe('dark')
    storage.setItem('donote.theme', 'light')
    expect(getInitialTheme(storage)).toBe('light')
    storage.setItem('donote.theme', 'unexpected')
    expect(getInitialTheme(storage)).toBe('dark')
  })

  test('applies and toggles theme on the document root', () => {
    const storage = new MemoryStorage()
    const root = document.createElement('html')

    applyTheme('dark', storage, root)
    expect(root.dataset.theme).toBe('dark')
    expect(storage.getItem('donote.theme')).toBe('dark')

    const next: ThemeMode = toggleTheme('dark', storage, root)
    expect(next).toBe('light')
    expect(root.dataset.theme).toBe('light')
  })
})
