import { describe, expect, test } from 'vitest'
import {
  attachmentDirectoriesStorageKey,
  defaultAttachmentDirectories,
  getInitialAttachmentDirectories,
  normalizeAttachmentDirectories,
  saveAttachmentDirectories,
} from './attachmentDirectories'

function createStorage(value: string | null): Storage {
  const values = new Map<string, string>()
  if (value !== null) {
    values.set(attachmentDirectoriesStorageKey, value)
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

describe('attachment directory settings', () => {
  test('starts empty until the user configures attachment directories', () => {
    expect(getInitialAttachmentDirectories(createStorage(null))).toEqual(
      defaultAttachmentDirectories,
    )
  })

  test('normalizes slashes and trims outer separators', () => {
    expect(
      normalizeAttachmentDirectories({
        images: ' assets\\images/ ',
        files: '/assets/files/',
      }),
    ).toEqual({
      images: 'assets/images',
      files: 'assets/files',
    })
  })

  test('rejects absolute or parent traversal directories', () => {
    expect(
      normalizeAttachmentDirectories({
        images: '../outside',
        files: 'C:/outside',
      }),
    ).toEqual(defaultAttachmentDirectories)
  })

  test('saves normalized attachment directories', () => {
    const storage = createStorage(null)

    expect(
      saveAttachmentDirectories(
        {
          images: ' assets/images ',
          files: 'assets\\files',
        },
        storage,
      ),
    ).toEqual({
      images: 'assets/images',
      files: 'assets/files',
    })
    expect(storage.getItem(attachmentDirectoriesStorageKey)).toBe(
      '{"images":"assets/images","files":"assets/files"}',
    )
  })
})
