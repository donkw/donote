import { describe, expect, test } from 'vitest'
import {
  getInitialOpenDocumentSession,
  openDocumentSessionStorageKey,
  saveOpenDocumentSession,
} from './openDocumentSession'

function createStorage(value: string | null): Storage {
  const values = new Map<string, string>()
  if (value !== null) {
    values.set(openDocumentSessionStorageKey, value)
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

describe('open document session', () => {
  test('returns null when no saved session exists', () => {
    expect(getInitialOpenDocumentSession(createStorage(null))).toBeNull()
  })

  test('normalizes saved open document paths and active path', () => {
    const storage = createStorage(
      JSON.stringify({
        rootPath: 'D:/notes',
        paths: ['intro.md', 'intro.md', '', '../bad.md', 'folder/next.md'],
        activePath: 'missing.md',
      }),
    )

    expect(getInitialOpenDocumentSession(storage)).toEqual({
      rootPath: 'D:/notes',
      paths: ['intro.md', 'folder/next.md'],
      activePath: 'intro.md',
    })
  })

  test('saves a normalized session and removes empty sessions', () => {
    const storage = createStorage(null)

    expect(
      saveOpenDocumentSession(
        {
          rootPath: 'D:/notes',
          paths: ['intro.md', 'folder/next.md'],
          activePath: 'folder/next.md',
        },
        storage,
      ),
    ).toEqual({
      rootPath: 'D:/notes',
      paths: ['intro.md', 'folder/next.md'],
      activePath: 'folder/next.md',
    })
    expect(storage.getItem(openDocumentSessionStorageKey)).toBe(
      '{"rootPath":"D:/notes","paths":["intro.md","folder/next.md"],"activePath":"folder/next.md"}',
    )

    expect(
      saveOpenDocumentSession(
        {
          rootPath: 'D:/notes',
          paths: [],
          activePath: '',
        },
        storage,
      ),
    ).toBeNull()
    expect(storage.getItem(openDocumentSessionStorageKey)).toBeNull()
  })

  test('ignores malformed sessions', () => {
    expect(getInitialOpenDocumentSession(createStorage('{bad json'))).toBeNull()
    expect(getInitialOpenDocumentSession(createStorage(JSON.stringify({ rootPath: '' })))).toBeNull()
  })
})
