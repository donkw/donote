import { describe, expect, test } from 'vitest'
import {
  resolvedImageSourceCacheKey,
  restoreResolvedImageSources,
} from './markdownImageSources'

describe('restoreResolvedImageSources', () => {
  test('restores a resolved preview data URL to the original markdown image source', () => {
    const resolvedSources = new Map([
      [
        resolvedImageSourceCacheKey('notes/intro.md', '../assets/photo.png'),
        'data:image/png;base64,aW1hZ2U=',
      ],
    ])

    expect(
      restoreResolvedImageSources(
        '![local](data:image/png;base64,aW1hZ2U=)',
        '![local](../assets/photo.png)',
        'notes/intro.md',
        resolvedSources,
      ),
    ).toBe('![local](../assets/photo.png)')
  })

  test('keeps user edits while restoring resolved image targets', () => {
    const resolvedSources = new Map([
      [
        resolvedImageSourceCacheKey('notes/intro.md', '../assets/photo.png'),
        'data:image/png;base64,aW1hZ2U=',
      ],
    ])

    expect(
      restoreResolvedImageSources(
        '# Edited\n\n![local](data:image/png;base64,aW1hZ2U= "donote-width=260")',
        '# Intro\n\n![local](../assets/photo.png)',
        'notes/intro.md',
        resolvedSources,
      ),
    ).toBe('# Edited\n\n![local](../assets/photo.png "donote-width=260")')
  })

  test('restores duplicate resolved images by occurrence', () => {
    const resolvedSources = new Map([
      [
        resolvedImageSourceCacheKey('notes/intro.md', '../assets/one.png'),
        'data:image/png;base64,c2FtZQ==',
      ],
      [
        resolvedImageSourceCacheKey('notes/intro.md', '../assets/two.png'),
        'data:image/png;base64,c2FtZQ==',
      ],
    ])

    expect(
      restoreResolvedImageSources(
        '![one](data:image/png;base64,c2FtZQ==)\n![two](data:image/png;base64,c2FtZQ==)',
        '![one](../assets/one.png)\n![two](../assets/two.png)',
        'notes/intro.md',
        resolvedSources,
      ),
    ).toBe('![one](../assets/one.png)\n![two](../assets/two.png)')
  })

  test('leaves unmatched data URLs unchanged', () => {
    expect(
      restoreResolvedImageSources(
        '![local](data:image/png;base64,ZXhwbGljaXQ=)',
        '![local](../assets/photo.png)',
        'notes/intro.md',
        new Map(),
      ),
    ).toBe('![local](data:image/png;base64,ZXhwbGljaXQ=)')
  })
})
