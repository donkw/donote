# Obsidian Dark Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved B1 Obsidian-style dark application shell while preserving Donote's existing workspace, tree, editor, tab, search, save, and settings behavior.

**Architecture:** Keep Vue component behavior intact and drive the redesign through shared CSS variables plus focused markup hooks in `WorkspaceSidebar.vue`. Use Element Plus `ElTree`, `ElTabs`, `ElDrawer`, and `ElButton` as-is; restyle their local surfaces through existing class names and dark theme variables.

**Tech Stack:** Vue 3 single-file components, TypeScript, Element Plus, lucide-vue icons, Vitest, Vue Test Utils, Vite.

---

## File Structure

- Modify `frontend/src/style.css`: replace the dark theme palette with the Obsidian shell palette, then restyle the workspace sidebar, file tree, document tabs, editor pane, utility rail, utility drawer, search panel, and dark Element Plus controls.
- Modify `frontend/src/style.test.ts`: add regression tests for the selected dark palette and required shell selectors.
- Modify `frontend/src/components/WorkspaceSidebar.vue`: add compact root-level action buttons in the sidebar header using existing `create-markdown` and `create-folder` emits.
- Modify `frontend/src/components/WorkspaceSidebar.test.ts`: update expectations for the header and add a test proving the new root action buttons emit existing events.
- No backend files should change for this feature.
- No generated Wails binding files should change for this feature.

## Task 1: Add CSS Regression Tests For The B1 Dark Shell

**Files:**
- Modify: `frontend/src/style.test.ts`

- [ ] **Step 1: Write the failing CSS tests**

Replace `frontend/src/style.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run the focused style test and verify it fails**

Run:

```powershell
npm --prefix frontend test -- src/style.test.ts
```

Expected: `Obsidian dark shell styles > uses the selected dark shell palette for the dark theme` fails because the current dark theme still uses values such as `#111827`, `#1f2937`, teal accent variables, and no `.workspace-sidebar__top` selector.

- [ ] **Step 3: Do not implement yet**

Leave the test failing until Task 3 and Task 4 provide the CSS implementation.

## Task 2: Add Sidebar Header Action Tests

**Files:**
- Modify: `frontend/src/components/WorkspaceSidebar.test.ts`

- [ ] **Step 1: Update the existing header expectations**

In the `renders workspace as the tree root with search and indented children` test, replace these three assertions:

```ts
expect(wrapper.find('.workspace-title').exists()).toBe(false)
expect(wrapper.find('[data-test="open-workspace"]').exists()).toBe(false)
expect(wrapper.find('[data-test="new-note"]').exists()).toBe(false)
```

with:

```ts
expect(wrapper.get('.workspace-title').text()).toBe('notes')
expect(wrapper.find('[data-test="open-workspace"]').exists()).toBe(false)
expect(wrapper.get('[data-test="new-note"]').attributes('aria-label')).toBe('新建笔记')
expect(wrapper.get('[data-test="new-folder"]').attributes('aria-label')).toBe('新建文件夹')
```

- [ ] **Step 2: Add a failing test for root action emits**

Add this test before `uses the workspace root context menu for root-level creation only`:

```ts
test('emits root-level creation actions from the sidebar header', async () => {
  const wrapper = mount(WorkspaceSidebar, {
    props: {
      workspaceName: 'notes',
      tree,
      activeFilePath: '',
      expandedFolderPaths: ['projects', 'projects/archive'],
    },
  })

  await wrapper.get('[data-test="new-note"]').trigger('click')
  await wrapper.get('[data-test="new-folder"]').trigger('click')

  expect(wrapper.emitted('create-markdown')).toEqual([['']])
  expect(wrapper.emitted('create-folder')).toEqual([['']])
})
```

- [ ] **Step 3: Run the focused sidebar test and verify it fails**

Run:

```powershell
npm --prefix frontend test -- src/components/WorkspaceSidebar.test.ts
```

Expected: the updated header assertions and new emit test fail because `WorkspaceSidebar.vue` does not render `.workspace-title`, `[data-test="new-note"]`, or `[data-test="new-folder"]`.

## Task 3: Implement Sidebar Header Actions

**Files:**
- Modify: `frontend/src/components/WorkspaceSidebar.vue`
- Test: `frontend/src/components/WorkspaceSidebar.test.ts`

- [ ] **Step 1: Import the action icons**

Change the lucide import in `WorkspaceSidebar.vue` from:

```ts
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Search } from '@lucide/vue'
```

to:

```ts
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Search,
} from '@lucide/vue'
```

- [ ] **Step 2: Add the header markup**

Inside `<div class="sidebar-header">`, before the existing search wrapper, add:

```vue
      <div v-if="workspaceName || tree.length" class="workspace-sidebar__top">
        <p class="workspace-title">
          <span>{{ workspaceName }}</span>
        </p>
        <div class="workspace-actions" aria-label="工作区操作">
          <button
            data-test="new-note"
            class="workspace-action-button"
            type="button"
            aria-label="新建笔记"
            title="新建笔记"
            @click="$emit('create-markdown', '')"
          >
            <FilePlus2 :size="15" />
          </button>
          <button
            data-test="new-folder"
            class="workspace-action-button"
            type="button"
            aria-label="新建文件夹"
            title="新建文件夹"
            @click="$emit('create-folder', '')"
          >
            <FolderPlus :size="15" />
          </button>
        </div>
      </div>
```

The beginning of the template should become:

```vue
<template>
  <aside class="sidebar workspace-sidebar">
    <div class="sidebar-header">
      <div v-if="workspaceName || tree.length" class="workspace-sidebar__top">
        <p class="workspace-title">
          <span>{{ workspaceName }}</span>
        </p>
        <div class="workspace-actions" aria-label="工作区操作">
          <button
            data-test="new-note"
            class="workspace-action-button"
            type="button"
            aria-label="新建笔记"
            title="新建笔记"
            @click="$emit('create-markdown', '')"
          >
            <FilePlus2 :size="15" />
          </button>
          <button
            data-test="new-folder"
            class="workspace-action-button"
            type="button"
            aria-label="新建文件夹"
            title="新建文件夹"
            @click="$emit('create-folder', '')"
          >
            <FolderPlus :size="15" />
          </button>
        </div>
      </div>
      <div v-if="workspaceName || tree.length" data-test="file-tree-search" class="file-tree-search">
        <ElInput
          v-model="fileTreeQuery"
          placeholder="搜索文件"
          clearable
          aria-label="搜索文件"
        >
```

- [ ] **Step 3: Run the focused sidebar test and verify it passes**

Run:

```powershell
npm --prefix frontend test -- src/components/WorkspaceSidebar.test.ts
```

Expected: all `WorkspaceSidebar` tests pass.

- [ ] **Step 4: Commit the sidebar behavior hook**

Run:

```powershell
git add frontend/src/components/WorkspaceSidebar.vue frontend/src/components/WorkspaceSidebar.test.ts
git commit -m "Add workspace sidebar creation actions"
```

Expected: commit includes only `WorkspaceSidebar.vue` and `WorkspaceSidebar.test.ts`.

## Task 4: Implement The Dark Theme Palette And Sidebar Styling

**Files:**
- Modify: `frontend/src/style.css`
- Test: `frontend/src/style.test.ts`

- [ ] **Step 1: Replace the dark theme token block**

Replace the entire `:root[data-theme='dark']` block with:

```css
:root[data-theme='dark'] {
  color-scheme: dark;
  color: #d8dee9;
  background: #11151c;
  --app-bg: #11151c;
  --surface: #202632;
  --surface-muted: #161a22;
  --surface-raised: #252d3a;
  --border: #2b3240;
  --border-strong: #3b4658;
  --text: #d8dee9;
  --text-muted: #9aa7bc;
  --text-subtle: #6e7a90;
  --accent: #7ea7ff;
  --accent-soft: #2b3a56;
  --accent-strong: #d9e7ff;
  --danger: #ff8a80;
  --warning: #f2bd66;
  --shadow-soft: 0 20px 48px rgba(0, 0, 0, 0.34);
  --shadow-control: 0 1px 2px rgba(0, 0, 0, 0.28);
  --focus-ring: 0 0 0 3px rgba(126, 167, 255, 0.24);
  --el-color-primary: var(--accent);
  --el-color-primary-light-3: #a9c5ff;
  --el-color-primary-light-5: #6f8ed1;
  --el-color-primary-light-7: #344665;
  --el-color-primary-light-8: #2b3a56;
  --el-color-primary-light-9: #223047;
  --el-color-primary-dark-2: #b7cdff;
  --el-text-color-primary: var(--text);
  --el-text-color-regular: var(--text-muted);
  --el-text-color-secondary: var(--text-subtle);
  --el-border-color: var(--border);
  --el-border-color-light: var(--border);
  --el-border-color-lighter: var(--border);
  --el-fill-color: var(--surface);
  --el-fill-color-light: var(--surface-raised);
  --el-fill-color-lighter: var(--surface-raised);
  --el-fill-color-blank: var(--surface);
  --el-bg-color: var(--surface);
  --el-bg-color-overlay: var(--surface-raised);
  --el-mask-color: rgba(5, 8, 13, 0.64);
}
```

- [ ] **Step 2: Replace the sidebar header and title CSS**

Replace the `.sidebar-header`, `.workspace-title`, `.workspace-title span`, and `.sidebar-empty` blocks with:

```css
.sidebar-header {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-muted), var(--surface) 28%);
}

.workspace-sidebar__top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 30px;
}

.workspace-title {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 30px;
  margin: 0;
  color: var(--text);
  font-size: 12px;
  font-weight: 780;
  letter-spacing: 0;
}

.workspace-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.workspace-action-button {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.workspace-action-button:hover,
.workspace-action-button:focus-visible {
  border-color: color-mix(in srgb, var(--accent), transparent 40%);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.sidebar-empty {
  margin: 4px 0;
  color: var(--text-subtle);
}
```

- [ ] **Step 3: Replace file tree search and row styling**

Replace the existing `.file-tree-search`, `.file-tree`, `.tree-row`, `.file-tree-node`, `.file-tree-node::before`, `.file-tree-node.workspace-root`, `.tree-row.folder`, active row, hover row, and context menu style blocks with these definitions:

```css
.file-tree-search .el-input__wrapper {
  min-height: 34px;
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border) inset;
}

.file-tree-search .el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px var(--accent) inset;
}

.file-tree-search .el-input__prefix {
  color: var(--text-subtle);
}

.file-tree {
  min-height: 100%;
  padding: 8px 8px 16px;
  background: transparent;
  color: var(--text);
}

.file-tree .el-tree-node__content {
  height: auto;
  min-height: 30px;
  padding-left: 0 !important;
  background: transparent;
}

.file-tree .el-tree-node__expand-icon {
  display: none;
}

.file-tree .el-tree-node:focus > .el-tree-node__content {
  background: transparent;
}

.file-tree .el-tree-node__children {
  position: relative;
}

.tree-row,
.file-tree-node,
.outline-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 31px;
  gap: 7px;
  padding: 4px 8px 4px calc(8px + (var(--tree-depth, 0) * 16px));
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  font-size: inherit;
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.file-tree-node {
  position: relative;
}

.file-tree-node::before {
  position: absolute;
  top: 7px;
  bottom: 7px;
  left: calc(10px + (var(--tree-depth, 0) * 16px));
  width: 1px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border), transparent 16%);
  content: '';
  opacity: min(var(--tree-depth, 0), 1);
}

.file-tree-node.workspace-root {
  min-height: 32px;
  margin-bottom: 5px;
  color: var(--text);
  font-weight: 780;
}

.file-tree-node.workspace-root::before {
  display: none;
}

.file-tree-node svg,
.file-tree-node__name {
  position: relative;
}

.tree-row.folder {
  color: var(--text);
  font-weight: 700;
}

.tree-row.active,
.file-tree .is-current > .el-tree-node__content .tree-row {
  border-color: color-mix(in srgb, var(--accent), transparent 44%);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.tree-row:hover,
.outline-row:hover {
  background: color-mix(in srgb, var(--surface), var(--border) 24%);
  color: var(--text);
}

.file-tree-context-menu {
  position: absolute;
  z-index: 30;
  display: grid;
  min-width: 152px;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-raised, var(--surface));
  box-shadow: 0 18px 44px rgb(0 0 0 / 30%);
}

.context-menu-item {
  display: flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font: inherit;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
}

.context-menu-item:hover,
.context-menu-item:focus-visible {
  background: var(--accent-soft);
  color: var(--accent-strong);
  outline: 0;
}

.context-menu-item.danger {
  color: var(--danger, #dc2626);
}

.context-menu-item.danger:hover,
.context-menu-item.danger:focus-visible {
  background: color-mix(in srgb, var(--danger, #dc2626), transparent 88%);
  color: var(--danger, #dc2626);
}
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
npm --prefix frontend test -- src/style.test.ts src/components/WorkspaceSidebar.test.ts
```

Expected: `WorkspaceSidebar` tests pass. `style.test.ts` may still fail on document tab, utility rail, or drawer selectors until Task 5 finishes.

## Task 5: Coordinate Tabs, Editor, Rail, Drawer, Search, And Element Plus Controls

**Files:**
- Modify: `frontend/src/style.css`
- Test: `frontend/src/style.test.ts`

- [ ] **Step 1: Update shell and editor surface rules**

Ensure these blocks have the following final declarations:

```css
.workspace-sidebar,
.sidebar {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--border);
  background: var(--surface-muted);
  font-size: var(--sidebar-font-size, 13px);
}

.sidebar-resizer {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  border-right: 1px solid var(--border);
  border-left: 1px solid transparent;
  background: color-mix(in srgb, var(--surface-muted), var(--app-bg) 35%);
  cursor: col-resize;
}

.editor-pane {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--app-bg);
  font-size: var(--editor-font-size, 17px);
}
```

- [ ] **Step 2: Replace document tab styling**

Replace the `.document-tabs` block group with:

```css
.document-tabs.el-tabs {
  grid-row: 1;
  min-width: 0;
  min-height: 40px;
  background: var(--surface-muted);
}

.document-tabs .el-tabs__header {
  height: 40px;
  margin: 0;
  padding: 7px 32px 0;
  border-bottom: 1px solid var(--border);
}

.document-tabs.el-tabs--card > .el-tabs__header .el-tabs__nav {
  border: 0;
}

.document-tabs.el-tabs--card > .el-tabs__header .el-tabs__item {
  max-width: 210px;
  height: 33px;
  margin-right: 6px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-bottom: 0;
  border-radius: 8px 8px 0 0;
  background: color-mix(in srgb, var(--surface), var(--surface-muted) 32%);
  color: var(--text-muted);
}

.document-tabs.el-tabs--card > .el-tabs__header .el-tabs__item.is-active {
  border-color: var(--border);
  background: var(--surface);
  color: var(--text);
}

.document-tabs .el-tabs__content {
  display: none;
}
```

- [ ] **Step 3: Replace utility rail styling**

Replace the `.utility-rail`, `.utility-rail .el-button`, and `.utility-rail__divider` blocks with:

```css
.utility-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: var(--rail-width);
  min-width: var(--rail-width);
  min-height: 0;
  padding: 10px 6px;
  border-left: 1px solid var(--border);
  background: var(--surface-muted);
}

.utility-rail .el-button {
  width: 34px;
  height: 34px;
  min-height: 34px;
  margin: 0;
  border-color: var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
}

.utility-rail .el-button:hover,
.utility-rail .el-button:focus-visible,
.utility-rail .el-button.el-button--primary {
  border-color: color-mix(in srgb, var(--accent), transparent 38%);
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.utility-rail__divider {
  width: 22px;
  height: 1px;
  margin: 2px 0;
  background: var(--border);
}
```

- [ ] **Step 4: Update drawer and search panel styling**

Ensure these blocks contain:

```css
.el-drawer.utility-drawer {
  background: var(--surface);
  color: var(--text);
}

.utility-drawer .el-drawer__header {
  align-items: center;
  min-height: 52px;
  margin: 0;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-size: 15px;
  font-weight: 750;
}

.utility-drawer .el-drawer__body {
  min-height: 0;
  padding: 14px;
  overflow: auto;
}

.search-panel {
  grid-row: 2;
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 44px;
  padding: 6px 32px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}
```

- [ ] **Step 5: Add dark Element Plus control overrides**

After the base `.el-button { letter-spacing: 0; }` rule, add:

```css
:root[data-theme='dark'] .el-input__wrapper,
:root[data-theme='dark'] .el-textarea__inner {
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border) inset;
}

:root[data-theme='dark'] .el-input__wrapper.is-focus,
:root[data-theme='dark'] .el-textarea__inner:focus {
  box-shadow: 0 0 0 1px var(--accent) inset;
}

:root[data-theme='dark'] .el-button:not(.el-button--primary) {
  border-color: var(--border);
  background: var(--surface);
  color: var(--text-muted);
}

:root[data-theme='dark'] .el-button:not(.el-button--primary):hover,
:root[data-theme='dark'] .el-button:not(.el-button--primary):focus-visible {
  border-color: color-mix(in srgb, var(--accent), transparent 38%);
  background: var(--accent-soft);
  color: var(--accent-strong);
}
```

- [ ] **Step 6: Run focused style tests**

Run:

```powershell
npm --prefix frontend test -- src/style.test.ts
```

Expected: all `style.test.ts` tests pass.

- [ ] **Step 7: Commit the dark shell styling**

Run:

```powershell
git add frontend/src/style.css frontend/src/style.test.ts
git commit -m "Apply Obsidian dark shell styling"
```

Expected: commit includes only `frontend/src/style.css` and `frontend/src/style.test.ts`.

## Task 6: Run Full Frontend Verification

**Files:**
- Verify: frontend source tree

- [ ] **Step 1: Run all frontend tests**

Run:

```powershell
npm --prefix frontend test
```

Expected: all Vitest suites pass.

- [ ] **Step 2: Run the frontend production build**

Run:

```powershell
npm --prefix frontend run build
```

Expected: `vue-tsc --noEmit` and `vite build` complete with exit code `0`.

- [ ] **Step 3: Inspect the final diff**

Run:

```powershell
git diff --stat HEAD
git diff -- frontend/src/components/WorkspaceSidebar.vue frontend/src/components/WorkspaceSidebar.test.ts frontend/src/style.css frontend/src/style.test.ts
```

Expected: only the planned frontend files appear in this feature diff, apart from pre-existing unrelated worktree changes.

## Task 7: Visual QA In The Running App

**Files:**
- Verify: `frontend/src/style.css`
- Verify: `frontend/src/components/WorkspaceSidebar.vue`

- [ ] **Step 1: Start the frontend dev server**

Run:

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1
```

Expected: Vite reports a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 2: Check required visual states**

Open the local URL or the Wails dev shell and check:

- Dark theme selected through the existing theme toggle.
- Workspace opened with nested folders.
- Active file row is visible as a blue-gray pill.
- Search input focus state is readable.
- Right-click context menu works on files and folders.
- Root-level sidebar buttons create a note and folder through the existing prompts.
- Open document tabs handle long file names with ellipsis.
- Utility rail active, inactive, save, and theme buttons are readable.
- Utility drawer outline and settings panels are readable.
- Empty workspace state is readable.
- Light theme remains readable after toggling back.

- [ ] **Step 3: Stop the dev server**

Stop the Vite process with `Ctrl+C`.

- [ ] **Step 4: Commit any visual polish fixes**

If visual QA required CSS-only corrections, run the focused tests again:

```powershell
npm --prefix frontend test -- src/style.test.ts src/components/WorkspaceSidebar.test.ts
npm --prefix frontend run build
```

Then commit only the polish files:

```powershell
git add frontend/src/style.css frontend/src/components/WorkspaceSidebar.vue frontend/src/components/WorkspaceSidebar.test.ts frontend/src/style.test.ts
git commit -m "Polish dark shell visual states"
```

Expected: no commit is created if visual QA required no changes.

## Self-Review Notes

- Spec coverage: the plan covers full dark shell palette, sidebar tree polish, context menu polish, tabs, editor pane, rail, drawer, search panel, Element Plus dark controls, existing behavior preservation, tests, build, and visual QA.
- Scope control: the plan does not replace `ElTree`, does not add drag-and-drop, does not change backend workspace operations, and does not change generated Wails bindings.
- Type consistency: new events reuse existing `create-markdown` and `create-folder` emits with an empty string root path, matching current root context menu behavior.
