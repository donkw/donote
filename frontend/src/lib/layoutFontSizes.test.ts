import { describe, expect, test } from 'vitest'
import {
  defaultLayoutFontSizes,
  getInitialLayoutFontSizes,
  layoutFontSizeControls,
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
        tabs: 9,
        editor: 20,
        outline: 30,
      }),
    )

    expect(getInitialLayoutFontSizes(storage)).toEqual({
      sidebar: 10,
      tabs: 10,
      editor: 20,
      outline: 18,
    })
  })

  test('migrates saved settings from before tabs had a separate font size', () => {
    const storage = createStorage(
      JSON.stringify({
        sidebar: 14,
        editor: 19,
        outline: 15,
      }),
    )

    expect(getInitialLayoutFontSizes(storage)).toEqual({
      sidebar: 14,
      tabs: 13,
      editor: 19,
      outline: 15,
    })
  })

  test('supports all layout font sizes down to 10 pixels', () => {
    expect(layoutFontSizeControls.map((control) => [control.key, control.min])).toEqual([
      ['sidebar', 10],
      ['tabs', 10],
      ['editor', 10],
      ['outline', 10],
    ])
    expect(normalizeLayoutFontSizes({ sidebar: 8, tabs: 9, editor: 9, outline: 7 })).toEqual({
      sidebar: 10,
      tabs: 10,
      editor: 10,
      outline: 10,
    })
  })

  test('supports document tab font sizes from 10 to 16 pixels', () => {
    const tabsControl = layoutFontSizeControls.find((control) => control.key === 'tabs')

    expect(tabsControl?.label).toBe('文档标签栏')
    expect(tabsControl?.min).toBe(10)
    expect(tabsControl?.max).toBe(16)
    expect(normalizeLayoutFontSizes({ sidebar: 13, tabs: 20, editor: 17, outline: 13 })).toEqual({
      sidebar: 13,
      tabs: 16,
      editor: 17,
      outline: 13,
    })
  })

  test('ignores partial or malformed font size settings', () => {
    expect(normalizeLayoutFontSizes({ sidebar: 14 })).toEqual(defaultLayoutFontSizes)
    expect(getInitialLayoutFontSizes(createStorage('{bad json'))).toEqual(defaultLayoutFontSizes)
  })
})
