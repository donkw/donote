import { describe, expect, test } from 'vitest'

const nodeFs = 'node:fs'
const { readFileSync } = await import(nodeFs)
const cwd = (globalThis as typeof globalThis & { process: { cwd: () => string } }).process.cwd()
const stylesheet = readFileSync(`${cwd}/src/style.css`, 'utf8') as string

function cssRule(selector: string) {
  const selectorIndex = stylesheet.indexOf(selector)
  const blockStart = selectorIndex >= 0 ? stylesheet.indexOf('{', selectorIndex) : -1
  const blockEnd = blockStart >= 0 ? stylesheet.indexOf('}', blockStart) : -1
  const selectorStart = selectorIndex >= 0 ? stylesheet.lastIndexOf('}', selectorIndex) + 1 : -1
  return {
    selector:
      selectorStart >= 0 && blockStart >= 0 ? stylesheet.slice(selectorStart, blockStart).trim() : '',
    block: blockStart >= 0 && blockEnd >= 0 ? stylesheet.slice(blockStart + 1, blockEnd) : '',
  }
}

function cssBlock(selector: string) {
  return cssRule(selector).block
}

function expectCssVariable(block: string, name: string, value: string) {
  expect(block).toMatch(new RegExp(`${name}:\\s*${value.replaceAll('#', '\\#')}\\b`))
}

function expectSelectorExclusions(selector: string) {
  expect(selector).toContain(':not(.is-disabled)')
  expect(selector).toContain(':not([disabled])')
  expect(selector).toContain(':not(.is-text)')
  expect(selector).toContain(':not(.el-button--success)')
  expect(selector).toContain(':not(.el-button--warning)')
  expect(selector).toContain(':not(.el-button--danger)')
  expect(selector).toContain(':not(.el-button--info)')
}

describe('editor layout styles', () => {
  test('reserves vertical scrollbar space in the editor scroll container', () => {
    expect(cssBlock('.milkdown-shell')).toMatch(/scrollbar-gutter:\s*stable\b/)
  })
})

describe('Obsidian dark shell styles', () => {
  test('uses the selected dark shell palette for the dark theme', () => {
    const block = cssBlock(":root[data-theme='dark']")

    expectCssVariable(block, '--app-bg', '#11151c')
    expectCssVariable(block, '--surface', '#202632')
    expectCssVariable(block, '--surface-muted', '#161a22')
    expectCssVariable(block, '--border', '#2b3240')
    expectCssVariable(block, '--accent-soft', '#2b3a56')
    expectCssVariable(block, '--accent-strong', '#d9e7ff')
    expect(block).not.toContain('--border-strong')
  })

  test('defines focused dark shell styling hooks for the main surfaces', () => {
    expect(cssBlock('.workspace-sidebar')).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(cssBlock('.sidebar-header')).toMatch(/padding:\s*8px 12px/)
    expect(cssBlock('.workspace-sidebar__top')).toBe('')
    expect(cssBlock('.file-tree-context-menu')).toMatch(/box-shadow:\s*0 18px 44px/)
    expect(cssBlock('.document-tabs.el-tabs')).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(cssBlock('.document-tabs.el-tabs--card > .el-tabs__header .el-tabs__item')).toMatch(
      /color:\s*var\(--text-subtle\)/,
    )
    const activeTabBlock = cssBlock(
      '.document-tabs.el-tabs--card > .el-tabs__header .el-tabs__item.is-active',
    )
    expect(activeTabBlock).toMatch(/border-color:\s*color-mix\(in srgb,\s*var\(--accent\)/)
    expect(activeTabBlock).toMatch(/color:\s*var\(--accent-strong\)/)
    expect(activeTabBlock).toMatch(/box-shadow:\s*inset 0 2px 0 var\(--accent\)/)
    expect(cssBlock('.utility-rail')).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(cssBlock('.el-drawer.utility-drawer')).toMatch(/background:\s*var\(--surface\)/)
  })

  test('defines readable dark primary button foreground states', () => {
    const block = cssBlock(":root[data-theme='dark'] .el-button--primary")

    expect(block).toMatch(/--el-button-text-color:\s*var\(--app-bg\)/)
    expect(block).toMatch(/--el-button-hover-text-color:\s*var\(--app-bg\)/)
    expect(block).toMatch(/--el-button-active-text-color:\s*var\(--app-bg\)/)
    expect(block).toMatch(/color:\s*var\(--app-bg\)/)
  })

  test('keeps generic dark non-primary button overrides away from disabled text and semantic buttons', () => {
    const selectors = Array.from(
      stylesheet.matchAll(
        /:root\[data-theme='dark'\]\s+\.el-button:not\(\.el-button--primary\)[^{]+(?=\{)/g,
      ),
      (match) => match[0],
    )

    expect(selectors.length).toBeGreaterThanOrEqual(2)
    selectors.forEach(expectSelectorExclusions)
  })

  test('keeps utility rail button state styling disabled-safe', () => {
    const selectors = Array.from(
      stylesheet.matchAll(/\.utility-rail\s+\.el-button[^{]+(?=\{)/g),
      (match) => match[0],
    ).filter(
      (selector) =>
        selector.includes(':hover') ||
        selector.includes(':focus-visible') ||
        selector.includes('.el-button--primary'),
    )

    expect(selectors.length).toBeGreaterThan(0)
    selectors.forEach((selector) => {
      expect(selector).toContain(':not(.is-disabled)')
      expect(selector).toContain(':not([disabled])')
    })
  })
})
