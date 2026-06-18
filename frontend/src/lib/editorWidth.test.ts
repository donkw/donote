import { describe, expect, test } from 'vitest'
import {
  defaultEditorWidth,
  editorWidthStorageKey,
  getInitialEditorWidth,
  normalizeEditorWidth,
  saveEditorWidth,
} from './editorWidth'

function createStorage(value: string | null): Storage {
  const values = new Map<string, string>()
  if (value !== null) {
    values.set(editorWidthStorageKey, value)
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

describe('editor width settings', () => {
  test('uses the current editor width when no saved setting exists', () => {
    expect(getInitialEditorWidth(createStorage(null))).toBe(defaultEditorWidth)
  })

  test('normalizes saved editor widths to the supported range', () => {
    expect(getInitialEditorWidth(createStorage('640'))).toBe(720)
    expect(getInitialEditorWidth(createStorage('1320'))).toBe(1280)
    expect(normalizeEditorWidth(1100.4)).toBe(1100)
  })

  test('saves a normalized editor width', () => {
    const storage = createStorage(null)

    expect(saveEditorWidth(1300, storage)).toBe(1280)
    expect(storage.getItem(editorWidthStorageKey)).toBe('1280')
  })

  test('ignores malformed saved editor widths', () => {
    expect(getInitialEditorWidth(createStorage('wide'))).toBe(defaultEditorWidth)
    expect(normalizeEditorWidth(Number.NaN)).toBe(defaultEditorWidth)
  })
})
