import { describe, expect, test } from 'vitest'
import { createNaiveThemeOverrides } from './naiveTheme'

describe('createNaiveThemeOverrides', () => {
  test('maps Donote light and dark colors into Naive UI common tokens', () => {
    const light = createNaiveThemeOverrides('light')
    const dark = createNaiveThemeOverrides('dark')

    expect(light.common?.primaryColor).toBe('#0066cc')
    expect(light.common?.bodyColor).toBe('#f5f5f7')
    expect(light.common?.cardColor).toBe('#ffffff')
    expect(dark.common?.primaryColor).toBe('#64aaff')
    expect(dark.common?.bodyColor).toBe('#1c1c1e')
    expect(dark.common?.cardColor).toBe('#242426')
    expect(dark.Button?.heightSmall).toBe('32px')
  })
})
