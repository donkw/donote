import { describe, expect, test } from 'vitest'

const nodeFs = 'node:fs'
const { readFileSync } = await import(nodeFs)
const cwd = (globalThis as typeof globalThis & { process: { cwd: () => string } }).process.cwd()
const stylesheet = readFileSync(`${cwd}/src/style.css`, 'utf8') as string

function cssBlock(selector: string) {
  const selectorIndex = stylesheet.indexOf(selector)
  const blockStart = selectorIndex >= 0 ? stylesheet.indexOf('{', selectorIndex) : -1
  const blockEnd = blockStart >= 0 ? stylesheet.indexOf('}', blockStart) : -1
  return blockStart >= 0 && blockEnd >= 0 ? stylesheet.slice(blockStart + 1, blockEnd) : ''
}

function expectCssVariable(block: string, name: string, value: string) {
  expect(block).toMatch(new RegExp(`${name}:\\s*${value.replaceAll('#', '\\#')}\\b`))
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
  })

  test('defines focused dark shell styling hooks for the main surfaces', () => {
    expect(cssBlock('.workspace-sidebar')).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(cssBlock('.workspace-sidebar__top')).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/)
    expect(cssBlock('.file-tree-context-menu')).toMatch(/box-shadow:\s*0 18px 44px/)
    expect(cssBlock('.document-tabs.el-tabs')).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(cssBlock('.utility-rail')).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(cssBlock('.el-drawer.utility-drawer')).toMatch(/background:\s*var\(--surface\)/)
  })
})
