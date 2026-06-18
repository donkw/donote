import { describe, expect, test } from 'vitest'
import {
  defaultSidebarWidth,
  getInitialSidebarWidth,
  normalizeSidebarWidth,
  saveSidebarWidth,
  sidebarWidthStorageKey,
} from './sidebarWidth'

function createStorage(value: string | null): Storage {
  const values = new Map<string, string>()
  if (value !== null) {
    values.set(sidebarWidthStorageKey, value)
  }

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, item) => values.set(key, item),
  }
}

describe('sidebar width settings', () => {
  test('uses the current sidebar width when no saved setting exists', () => {
    expect(getInitialSidebarWidth(createStorage(null))).toBe(defaultSidebarWidth)
  })

  test('normalizes saved sidebar widths to the supported range', () => {
    expect(getInitialSidebarWidth(createStorage('180'))).toBe(220)
    expect(getInitialSidebarWidth(createStorage('520'))).toBe(480)
    expect(normalizeSidebarWidth(340.4)).toBe(340)
  })

  test('saves a normalized sidebar width', () => {
    const storage = createStorage(null)

    expect(saveSidebarWidth(200, storage)).toBe(220)
    expect(storage.getItem(sidebarWidthStorageKey)).toBe('220')
  })

  test('ignores malformed saved sidebar widths', () => {
    expect(getInitialSidebarWidth(createStorage('wide'))).toBe(defaultSidebarWidth)
    expect(normalizeSidebarWidth(Number.NaN)).toBe(defaultSidebarWidth)
  })
})
