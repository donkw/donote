import { describe, expect, test } from 'vitest'
import {
  defaultLayoutFontSizes,
  getInitialLayoutFontSizes,
  layoutFontSizeStorageKey,
  normalizeLayoutFontSizes,
} from './layoutFontSizes'

function createStorage(value: string | null): Storage {
  const values = new Map<string, string>()
  if (value !== null) {
    values.set(layoutFontSizeStorageKey, value)
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

describe('layout font sizes', () => {
  test('uses defaults when no saved settings exist', () => {
    expect(getInitialLayoutFontSizes(createStorage(null))).toEqual(defaultLayoutFontSizes)
  })

  test('normalizes saved font sizes to supported ranges', () => {
    const storage = createStorage(
      JSON.stringify({
        sidebar: 8,
        editor: 20,
        outline: 30,
      }),
    )

    expect(getInitialLayoutFontSizes(storage)).toEqual({
      sidebar: 12,
      editor: 20,
      outline: 18,
    })
  })

  test('ignores partial or malformed font size settings', () => {
    expect(normalizeLayoutFontSizes({ sidebar: 14 })).toEqual(defaultLayoutFontSizes)
    expect(getInitialLayoutFontSizes(createStorage('{bad json'))).toEqual(defaultLayoutFontSizes)
  })
})
