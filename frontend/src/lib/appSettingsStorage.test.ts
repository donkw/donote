import { describe, expect, test, vi } from 'vitest'
import { createAppSettingsStorage } from './appSettingsStorage'

describe('app settings storage', () => {
  test('normalizes loaded string values and exposes a Storage-compatible snapshot', () => {
    const storage = createAppSettingsStorage({
      values: {
        'donote.theme': 'light',
        'donote.sidebarWidth': '372',
        ignored: 123,
      },
    })

    expect(storage.getItem('donote.theme')).toBe('light')
    expect(storage.getItem('donote.sidebarWidth')).toBe('372')
    expect(storage.getItem('ignored')).toBeNull()
    expect(storage.snapshot()).toEqual({
      values: {
        'donote.theme': 'light',
        'donote.sidebarWidth': '372',
      },
    })
  })

  test('notifies when values are set, removed, or cleared', () => {
    const onChange = vi.fn()
    const storage = createAppSettingsStorage({ values: { existing: 'yes' } }, onChange)

    storage.setItem('next', 'value')
    storage.removeItem('existing')
    storage.clear()

    expect(onChange).toHaveBeenCalledTimes(3)
    expect(storage.snapshot()).toEqual({ values: {} })
  })

  test('can replace values without triggering persistence', () => {
    const onChange = vi.fn()
    const storage = createAppSettingsStorage({ values: { stale: 'value' } }, onChange)

    storage.replace({ values: { fresh: 'value' } })

    expect(onChange).not.toHaveBeenCalled()
    expect(storage.getItem('stale')).toBeNull()
    expect(storage.getItem('fresh')).toBe('value')
  })
})
