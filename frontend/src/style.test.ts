import { describe, expect, test } from 'vitest'

const nodeFs = 'node:fs'
const { readFileSync } = await import(nodeFs)
const cwd = (globalThis as typeof globalThis & { process: { cwd: () => string } }).process.cwd()
const stylesheet = readFileSync(`${cwd}/src/style.css`, 'utf8') as string

const legacyPrefix = 'el'
const legacyClassHooks = [
  'button',
  'drawer',
  'tree',
  'tabs',
  'input',
  'empty',
  'scrollbar',
  'textarea',
].map((hook) => `.${legacyPrefix}-${hook}`)

function cssRule(selector: string) {
  for (const match of stylesheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectorText = match[1].trim()
    const selectorList = selectorText.split(',').map((entry) => entry.trim())
    if (selectorList.includes(selector)) {
      return {
        selector: selectorText,
        block: match[2],
      }
    }
  }

  return { selector: '', block: '' }
}

function cssBlock(selector: string) {
  return cssRule(selector).block
}

function expectCssVariable(block: string, name: string, value: string) {
  expect(block).toMatch(new RegExp(`${name}:\\s*${value.replaceAll('#', '\\#')}\\b`))
}

function cssVariable(block: string, name: string) {
  return block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\b`))?.[1] ?? ''
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)
      ?.map((value) => {
        const channel = Number.parseInt(value, 16) / 255
        return channel <= 0.03928
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      })

    if (!channels) {
      return 0
    }
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }

  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
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

describe('Donote shell styles', () => {
  test('does not keep legacy component selectors or tokens in the stylesheet', () => {
    legacyClassHooks.forEach((hook) => {
      expect(stylesheet).not.toContain(hook)
    })
    expect(stylesheet).not.toContain(`--${legacyPrefix}-`)
  })

  test('uses the selected dark command palette for the dark theme', () => {
    const block = cssBlock(":root[data-theme='dark']")

    expectCssVariable(block, '--app-bg', '#050505')
    expectCssVariable(block, '--surface', '#0c0c0c')
    expectCssVariable(block, '--surface-muted', '#070707')
    expectCssVariable(block, '--surface-raised', '#151515')
    expectCssVariable(block, '--border', '#252525')
    expectCssVariable(block, '--accent', '#8f9ba3')
    expectCssVariable(block, '--accent-soft', '#1a2024')
    expectCssVariable(block, '--accent-strong', '#c5ccd1')
    expect(block).not.toContain('--border-strong')
  })

  test('keeps the dark theme readable against editor and sidebar surfaces', () => {
    const block = cssBlock(":root[data-theme='dark']")

    expect(contrastRatio(cssVariable(block, '--text'), cssVariable(block, '--surface'))).toBeGreaterThanOrEqual(
      4.5,
    )
    expect(
      contrastRatio(cssVariable(block, '--text-muted'), cssVariable(block, '--surface-muted')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(cssVariable(block, '--accent-strong'), cssVariable(block, '--accent-soft')),
    ).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(cssVariable(block, '--accent'), cssVariable(block, '--app-bg'))).toBeGreaterThanOrEqual(
      4.5,
    )
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
    expect(cssBlock('.utility-drawer')).toMatch(/background:\s*var\(--surface\)/)
  })

  test('maps the sidebar font size setting into native sidebar controls', () => {
    const block = cssBlock('.workspace-sidebar')

    expect(block).toMatch(/font-size:\s*var\(--sidebar-font-size,\s*13px\)/)
  })

  test('keeps file tree rows structured and keyboard-visible', () => {
    expect(cssBlock('.file-tree-node')).toMatch(/display:\s*grid\b/)
    expect(cssBlock('.file-tree-node')).toMatch(
      /grid-template-columns:\s*16px 20px minmax\(0,\s*1fr\)/,
    )
    expect(cssBlock('.file-tree-node:focus-visible')).toMatch(/box-shadow:\s*var\(--focus-ring\)/)
    expect(cssBlock('.file-tree-node__chevron')).toMatch(/width:\s*16px/)
    expect(cssBlock('.file-tree-node__icon')).toMatch(/width:\s*20px/)
    expect(cssBlock('.file-tree-node__label')).toMatch(/min-width:\s*0/)
  })

  test('positions the editor format toolbar on the right side of the editor', () => {
    const shellBlock = cssBlock('.milkdown-shell')
    const toolbarBlock = cssBlock('.editor-format-toolbar')

    expect(shellBlock).toMatch(
      /grid-template-columns:\s*minmax\(0,\s*min\(var\(--editor-content-width,\s*900px\),\s*calc\(100% - 52px\)\)\) 40px/,
    )
    expect(toolbarBlock).toMatch(/justify-self:\s*start/)
  })

  test('keeps command buttons square and accent-backed when active', () => {
    const toolbarBlock = cssBlock('.command-toolbar')
    const actionsBlock = cssBlock('.command-actions')
    const buttonBlock = cssBlock('.command-button')
    const activeButtonRule = cssRule('.command-button.active')

    expect(toolbarBlock).toMatch(/min-height:\s*34px/)
    expect(toolbarBlock).toMatch(/gap:\s*8px/)
    expect(toolbarBlock).toMatch(/padding:\s*2px 8px/)
    expect(cssBlock('.command-brand')).toBe('')
    expect(cssBlock('.brand-mark')).toBe('')
    expect(actionsBlock).toMatch(/gap:\s*4px/)
    expect(buttonBlock).toMatch(/width:\s*32px/)
    expect(buttonBlock).toMatch(/height:\s*32px/)
    expect(buttonBlock).toMatch(/min-width:\s*32px/)
    expect(buttonBlock).toMatch(/min-height:\s*32px/)
    expect(activeButtonRule.selector).toContain('.command-button.command-button--active')
    expect(activeButtonRule.block).toMatch(/background:\s*var\(--accent-soft\)/)
    expect(activeButtonRule.block).toMatch(/color:\s*var\(--accent-strong\)/)
  })

  test('keeps custom document tabs compact without legacy tab selectors', () => {
    const tabsBlock = cssBlock('.document-tabs')
    const trackBlock = cssBlock('.document-tabs__track')
    const listBlock = cssBlock('.document-tabs__list')
    const tabItemBlock = cssBlock('.document-tab')
    const activeTabBlock = cssBlock('.document-tab.active')
    const tabLabelBlock = cssBlock('.document-tab-label')
    const closeButtonBlock = cssBlock('.tab-close-button')

    expect(cssBlock(['.document-tabs', `${legacyPrefix}-tabs`].join('.'))).toBe('')
    expect(tabsBlock).toMatch(/min-height:\s*34px/)
    expect(tabsBlock).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(trackBlock).toMatch(/height:\s*34px/)
    expect(trackBlock).toMatch(/padding:\s*5px 28px 0/)
    expect(listBlock).toMatch(/display:\s*flex\b/)
    expect(tabItemBlock).toMatch(/max-width:\s*190px/)
    expect(tabItemBlock).toMatch(/height:\s*29px/)
    expect(tabItemBlock).toMatch(/margin-right:\s*4px/)
    expect(tabItemBlock).toMatch(/border-radius:\s*7px 7px 0 0/)
    expect(activeTabBlock).toMatch(/border-color:\s*color-mix\(in srgb,\s*var\(--accent\)/)
    expect(activeTabBlock).toMatch(/color:\s*var\(--accent-strong\)/)
    expect(activeTabBlock).toMatch(/box-shadow:\s*inset 0 2px 0 var\(--accent\)/)
    expect(tabLabelBlock).toMatch(/gap:\s*5px/)
    expect(closeButtonBlock).toMatch(/width:\s*18px/)
    expect(closeButtonBlock).toMatch(/height:\s*18px/)
    expect(closeButtonBlock).toMatch(/margin-left:\s*1px/)
    expect(closeButtonBlock).toMatch(/border-radius:\s*5px/)
  })

  test('uses native overflow for file tree and utility panel scrolling', () => {
    const fileTreeScrollBlock = cssBlock('.file-tree-scroll')
    const utilityPanelScrollBlock = cssBlock('.utility-panel-scroll')

    expect(fileTreeScrollBlock).toMatch(/min-height:\s*0/)
    expect(fileTreeScrollBlock).toMatch(/height:\s*100%/)
    expect(fileTreeScrollBlock).toMatch(/overflow:\s*auto/)
    expect(utilityPanelScrollBlock).toMatch(/min-height:\s*0/)
    expect(utilityPanelScrollBlock).toMatch(/height:\s*100%/)
    expect(utilityPanelScrollBlock).toMatch(/overflow:\s*auto/)
  })

  test('keeps search panel controls on native Donote classes', () => {
    const panelBlock = cssBlock('.search-panel')
    const closeButtonBlock = cssBlock('.search-close-button')
    const closeHoverRule = cssRule('.search-close-button:hover')

    expect(panelBlock).toMatch(/display:\s*flex\b/)
    expect(panelBlock).toMatch(/min-height:\s*44px/)
    expect(closeButtonBlock).toMatch(/width:\s*30px/)
    expect(closeButtonBlock).toMatch(/height:\s*30px/)
    expect(closeButtonBlock).toMatch(/margin-left:\s*auto/)
    expect(closeHoverRule.block).toMatch(/background:\s*var\(--surface-muted\)/)
    expect(closeHoverRule.block).toMatch(/color:\s*var\(--text\)/)
  })
})
