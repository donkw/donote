import { describe, expect, test } from 'vitest'
import { createNaiveThemeOverrides } from './naiveTheme'

describe('createNaiveThemeOverrides', () => {
  test('maps Donote light and dark colors into Naive UI common tokens', () => {
    const light = createNaiveThemeOverrides('light')
    const dark = createNaiveThemeOverrides('dark')

    expect(light.common?.primaryColor).toBe('#0f766e')
    expect(light.common?.bodyColor).toBe('#f4f6f8')
    expect(light.common?.cardColor).toBe('#ffffff')
    expect(dark.common?.primaryColor).toBe('#c5ccd1')
    expect(dark.common?.bodyColor).toBe('#050505')
    expect(dark.common?.cardColor).toBe('#0c0c0c')
    expect(dark.Button?.heightSmall).toBe('32px')
  })
})
