import { describe, expect, test } from 'vitest'
import {
  getCollapsedFolderPaths,
  saveCollapsedFolderPaths,
  toggleCollapsedFolderPath,
  treeExpansionStorageKey,
} from './treeExpansion'

function createStorage(value: string | null): Storage {
  const values = new Map<string, string>()
  if (value !== null) {
    values.set(treeExpansionStorageKey, value)
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

describe('tree expansion persistence', () => {
  test('defaults to no collapsed folders for a workspace', () => {
    expect(getCollapsedFolderPaths('D:/notes', createStorage(null))).toEqual([])
  })

  test('saves collapsed folders per workspace', () => {
    const storage = createStorage(null)

    saveCollapsedFolderPaths('D:/notes', ['projects'], storage)
    saveCollapsedFolderPaths('D:/other', ['archive'], storage)

    expect(getCollapsedFolderPaths('D:/notes', storage)).toEqual(['projects'])
    expect(getCollapsedFolderPaths('D:/other', storage)).toEqual(['archive'])
  })

  test('toggles folder paths without duplicates', () => {
    expect(toggleCollapsedFolderPath(['projects'], 'projects')).toEqual([])
    expect(toggleCollapsedFolderPath(['projects'], 'archive')).toEqual([
      'archive',
      'projects',
    ])
  })

  test('ignores malformed saved expansion data', () => {
    expect(getCollapsedFolderPaths('D:/notes', createStorage('{bad json'))).toEqual([])
    expect(getCollapsedFolderPaths('D:/notes', createStorage('{"D:/notes":[1]}'))).toEqual([])
  })
})
