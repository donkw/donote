import { describe, expect, test } from 'vitest'
import { isDocumentDirty } from './markdownDirty'

describe('isDocumentDirty', () => {
  test('treats Milkdown-normalized unordered list markers as clean', () => {
    expect(
      isDocumentDirty({
        content: '# Intro\n\n- item',
        savedContent: '# Intro\r\n\r\n* item',
      }),
    ).toBe(false)
  })

  test('keeps literal marker changes inside fenced code blocks dirty', () => {
    expect(
      isDocumentDirty({
        content: '```\n- literal\n```',
        savedContent: '```\n* literal\n```',
      }),
    ).toBe(true)
  })
})
