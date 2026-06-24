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

  test('reveals markdown block markers only on the active editor line', () => {
    const markerBlock = cssBlock(
      '.milkdown-editor .ProseMirror .donote-active-markdown-line[data-donote-markdown-prefix]::before',
    )
    const listBlock = cssBlock('.milkdown-editor .ProseMirror li.donote-active-markdown-line')

    expect(markerBlock).toMatch(/content:\s*attr\(data-donote-markdown-prefix\)/)
    expect(markerBlock).toMatch(/position:\s*absolute\b/)
    expect(markerBlock).toMatch(/color:\s*var\(--text-subtle\)/)
    expect(listBlock).toMatch(/list-style:\s*none\b/)
  })
})

describe('Dark command workspace styles', () => {
  test('uses the selected dark command palette for the dark theme', () => {
    const block = cssBlock(":root[data-theme='dark']")

    expectCssVariable(block, '--app-bg', '#1c1b1a')
    expectCssVariable(block, '--surface', '#23211f')
    expectCssVariable(block, '--surface-muted', '#181716')
    expectCssVariable(block, '--border', '#34302b')
    expectCssVariable(block, '--accent', '#b97855')
    expectCssVariable(block, '--accent-soft', '#33231d')
    expectCssVariable(block, '--accent-strong', '#d8a184')
    expect(block).not.toContain('--border-strong')
  })

  test('keeps dark primary button highlight states in the accent family', () => {
    const block = cssBlock(":root[data-theme='dark'] .el-button--primary")

    expect(block).toMatch(/--el-button-hover-bg-color:\s*#c98d68/)
    expect(block).toMatch(/--el-button-hover-border-color:\s*#c98d68/)
    expect(block).toMatch(/--el-button-active-bg-color:\s*#9d6244/)
    expect(block).toMatch(/--el-button-active-border-color:\s*#9d6244/)
  })

  test('defines focused command workspace styling hooks for the main surfaces', () => {
    expect(cssBlock('.app-shell')).toMatch(
      /grid-template-columns:\s*var\(--sidebar-width\) 8px minmax\(0,\s*1fr\)/,
    )
    expect(cssBlock('.app-shell.without-sidebar')).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    )
    expect(cssBlock('.command-toolbar')).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\) auto/)
    expect(cssBlock('.command-center-button')).toBe('')
    expect(cssBlock('.command-status')).toBe('')
    expect(cssBlock('.command-count')).toBe('')
    expect(cssBlock('.workspace-layout')).toMatch(/display:\s*contents/)
    expect(cssBlock('.workspace-sidebar')).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(cssBlock('.workspace-sidebar')).toMatch(/grid-row:\s*2 \/ 4/)
    expect(cssBlock('.sidebar-header')).toMatch(/padding:\s*8px 12px/)
    expect(cssBlock('.workspace-sidebar__top')).toBe('')
    const contextMenuBlock = cssBlock('.file-tree-context-menu')
    expect(contextMenuBlock).toMatch(/position:\s*fixed\b/)
    expect(contextMenuBlock).toMatch(/box-shadow:\s*0 18px 44px/)
    expect(cssBlock('.document-tabs.el-tabs')).toMatch(/background:\s*var\(--surface-muted\)/)
    const tabItemBlock = cssBlock('.document-tabs.el-tabs--card > .el-tabs__header .el-tabs__item')
    expect(tabItemBlock).toMatch(/color:\s*var\(--text-subtle\)/)
    expect(tabItemBlock).toMatch(/font-size:\s*var\(--tabs-font-size,\s*13px\)/)
    const activeTabBlock = cssBlock(
      '.document-tabs.el-tabs--card > .el-tabs__header .el-tabs__item.is-active',
    )
    expect(activeTabBlock).toMatch(/border-color:\s*color-mix\(in srgb,\s*var\(--accent\)/)
    expect(activeTabBlock).toMatch(/color:\s*var\(--accent-strong\)/)
    expect(activeTabBlock).toMatch(/box-shadow:\s*inset 0 2px 0 var\(--accent\)/)
    expect(cssBlock('.el-drawer.utility-drawer')).toMatch(/background:\s*var\(--surface\)/)
  })

  test('maps the sidebar font size setting into Element Plus sidebar controls', () => {
    const block = cssBlock('.workspace-sidebar')

    expect(block).toMatch(/--el-font-size-base:\s*var\(--sidebar-font-size,\s*13px\)/)
    expect(block).toMatch(/font-size:\s*var\(--sidebar-font-size,\s*13px\)/)
  })

  test('positions the editor format toolbar on the right side of the editor', () => {
    const shellBlock = cssBlock('.milkdown-shell')
    const toolbarBlock = cssBlock('.editor-format-toolbar')

    expect(shellBlock).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*min\(var\(--editor-content-width,\s*900px\),\s*calc\(100% - 52px\)\)\) 40px/,
    )
    expect(toolbarBlock).toMatch(/justify-self:\s*start/)
  })

  test('keeps the top command toolbar compact', () => {
    const toolbarBlock = cssBlock('.command-toolbar')
    const actionsBlock = cssBlock('.command-actions')
    const buttonBlock = cssBlock('.command-toolbar .el-button:not(.is-text)')

    expect(toolbarBlock).toMatch(/min-height:\s*40px/)
    expect(toolbarBlock).toMatch(/gap:\s*10px/)
    expect(toolbarBlock).toMatch(/padding:\s*4px 10px/)
    expect(cssBlock('.command-brand')).toBe('')
    expect(cssBlock('.brand-mark')).toBe('')
    expect(actionsBlock).toMatch(/gap:\s*6px/)
    expect(buttonBlock).toMatch(/width:\s*28px/)
    expect(buttonBlock).toMatch(/height:\s*28px/)
    expect(buttonBlock).toMatch(/min-height:\s*28px/)
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

  test('keeps command toolbar button state styling disabled-safe', () => {
    const selectors = Array.from(
      stylesheet.matchAll(/\.command-toolbar\s+\.el-button[^{]+(?=\{)/g),
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
