import { describe, expect, test } from 'vitest'
import { createNaiveThemeOverrides } from './naiveTheme'

describe('createNaiveThemeOverrides', () => {
  test('maps Donote light and dark colors into Naive UI common tokens', () => {
    const light = createNaiveThemeOverrides('light')
    const dark = createNaiveThemeOverrides('dark')

    expect(light.common?.primaryColor).toBe('#b45309')
    expect(light.common?.bodyColor).toBe('#f3f5f7')
    expect(light.common?.cardColor).toBe('#ffffff')
    expect(dark.common?.primaryColor).toBe('#f4b860')
    expect(dark.common?.bodyColor).toBe('#101318')
    expect(dark.common?.cardColor).toBe('#181c23')
    expect(dark.Button?.heightSmall).toBe('32px')
  })
})
