# Donote Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Donote's frontend shell as a modern Element Plus writing workspace with a left file sidebar, central tabbed editor, and right utility rail/drawer.

**Architecture:** Keep `App.vue` as the state orchestration layer and move UI surfaces into focused Vue components. Wails API calls stay in `App.vue`; child components receive props and emit user intents. Element Plus provides the app shell, tree, tabs, drawer, dialogs, forms, and feedback controls while Milkdown remains the editor engine.

**Tech Stack:** Wails, Go, Vue 3 `<script setup lang="ts">`, Vite, Vitest, Vue Test Utils, Element Plus `2.14.2`, lucide-vue, Milkdown.

---

## File Structure

- Modify: `frontend/package.json` to add `element-plus`.
- Modify: `frontend/package-lock.json` through `npm --prefix frontend install element-plus@2.14.2`.
- Modify: `frontend/package.json.md5` after dependency changes.
- Modify: `frontend/src/main.ts` to import Element Plus CSS.
- Modify: `frontend/src/style.css` to replace the current custom shell styling with Element Plus-compatible layout and theme tokens.
- Modify: `frontend/src/App.vue` to become the state orchestration layer and wire child components.
- Modify: `frontend/src/App.test.ts` to test the new Element Plus UI workflow.
- Create: `frontend/src/types/app.ts` for shared frontend view types.
- Create: `frontend/src/components/AppHeader.vue`.
- Create: `frontend/src/components/WorkspaceSidebar.vue`.
- Create: `frontend/src/components/DocumentTabs.vue`.
- Create: `frontend/src/components/EditorSurface.vue`.
- Create: `frontend/src/components/UtilityRail.vue`.
- Create: `frontend/src/components/UtilityDrawer.vue`.
- Create: `frontend/src/components/OutlinePanel.vue`.
- Create: `frontend/src/components/SearchPanel.vue`.
- Create: `frontend/src/components/SettingsPanel.vue`.
- Create: focused component tests under `frontend/src/components/*.test.ts` where the component emits or prop rendering is non-trivial.

---

### Task 1: Add Element Plus Dependency And Entry Styles

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/package.json.md5`
- Modify: `frontend/src/main.ts`

- [ ] **Step 1: Install Element Plus**

Run:

```powershell
Push-Location frontend
npm install element-plus@2.14.2
Pop-Location
```

Expected: `frontend/package.json` includes `"element-plus": "^2.14.2"` and `frontend/package-lock.json` includes an `element-plus` package entry.

- [ ] **Step 2: Import Element Plus styles**

Modify `frontend/src/main.ts` so the imports are:

```ts
import '@milkdown/kit/prose/view/style/prosemirror.css'
import '@milkdown/kit/prose/gapcursor/style/gapcursor.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
```

- [ ] **Step 3: Update the Wails package hash**

Run:

```powershell
(Get-FileHash -LiteralPath frontend\package.json -Algorithm MD5).Hash.ToLower() |
  Set-Content -LiteralPath frontend\package.json.md5 -NoNewline
```

Expected: `Get-Content frontend\package.json.md5` prints the lowercase MD5 hash of the current `frontend/package.json`.

- [ ] **Step 4: Verify dependency installation**

Run:

```powershell
npm --prefix frontend test
```

Expected: Existing tests pass or fail only because upcoming UI selectors have not been migrated. If a failure mentions `Cannot find module 'element-plus'`, stop and fix the install before continuing.

- [ ] **Step 5: Commit dependency setup**

Run:

```powershell
git add frontend/package.json frontend/package-lock.json frontend/package.json.md5 frontend/src/main.ts
git commit -m "Add Element Plus frontend dependency"
```

---

### Task 2: Add Shared Frontend View Types

**Files:**
- Create: `frontend/src/types/app.ts`
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Create shared types**

Create `frontend/src/types/app.ts`:

```ts
import type { main } from '../../wailsjs/go/models'
import type { OutlineItem } from '../lib/outline'
import type { SearchResult } from '../lib/search'

export interface VisibleNode {
  node: main.FileNode
  depth: number
}

export interface OpenDocument {
  path: string
  name: string
  content: string
  savedContent: string
  saving: boolean
  error: string
}

export type SaveState = 'saved' | 'saving' | 'dirty' | 'error'

export type UtilityPanel = 'outline' | 'search' | 'settings'

export interface SearchPanelState {
  query: string
  result: SearchResult
  activeIndex: number
}

export interface OutlinePanelState {
  items: OutlineItem[]
}
```

- [ ] **Step 2: Replace local interfaces in `App.vue`**

In `frontend/src/App.vue`, delete the local `VisibleNode` and `OpenDocument` interface blocks and add:

```ts
import type { OpenDocument, SaveState, UtilityPanel, VisibleNode } from './types/app'
```

Update `activeSaveState` so TypeScript knows its return type:

```ts
const activeSaveState = computed<SaveState>(() => {
  if (!activeDocument.value) return 'saved'
  if (activeDocument.value.saving) return 'saving'
  if (activeDocument.value.error) return 'error'
  if (isDocumentDirty(activeDocument.value)) return 'dirty'
  return 'saved'
})
```

- [ ] **Step 3: Add utility drawer state in `App.vue`**

Add these refs near the existing `showSearch` and `showSettings` state:

```ts
const activeUtilityPanel = ref<UtilityPanel>('outline')
const showUtilityDrawer = ref(false)
```

Add this function near `openSettings`:

```ts
function toggleUtilityPanel(panel: UtilityPanel) {
  if (activeUtilityPanel.value === panel) {
    showUtilityDrawer.value = !showUtilityDrawer.value
    return
  }
  activeUtilityPanel.value = panel
  showUtilityDrawer.value = true
  if (panel === 'settings') {
    draftLayoutFontSizes.value = { ...layoutFontSizes.value }
  }
}
```

- [ ] **Step 4: Run type and test checks**

Run:

```powershell
npm --prefix frontend run build
npm --prefix frontend test
```

Expected: Build and tests keep the same behavioral result as before this task.

- [ ] **Step 5: Commit shared types**

Run:

```powershell
git add frontend/src/types/app.ts frontend/src/App.vue
git commit -m "Extract app view types"
```

---

### Task 3: Build App Header Component

**Files:**
- Create: `frontend/src/components/AppHeader.vue`
- Create: `frontend/src/components/AppHeader.test.ts`
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Write the failing header tests**

Create `frontend/src/components/AppHeader.test.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import AppHeader from './AppHeader.vue'

describe('AppHeader', () => {
  test('renders brand, save status, and format actions', () => {
    const wrapper = mount(AppHeader, {
      props: {
        showSidebar: true,
        theme: 'light',
        saveStatusText: '有未保存更改',
        saveState: 'dirty',
      },
    })

    expect(wrapper.text()).toContain('Donote')
    expect(wrapper.text()).toContain('有未保存更改')
    expect(wrapper.find('[data-test="format-toolbar"]').exists()).toBe(true)
  })

  test('emits user intents from toolbar buttons', async () => {
    const wrapper = mount(AppHeader, {
      props: {
        showSidebar: false,
        theme: 'dark',
        saveStatusText: '已保存',
        saveState: 'saved',
      },
    })

    await wrapper.get('[data-test="sidebar-toggle"]').trigger('click')
    await wrapper.get('[data-test="format-heading"]').trigger('click')
    await wrapper.get('[data-test="save-now"]').trigger('click')
    await wrapper.get('[data-test="theme-toggle"]').trigger('click')

    expect(wrapper.emitted('toggle-sidebar')).toHaveLength(1)
    expect(wrapper.emitted('insert-markdown')?.[0]).toEqual(['# 标题'])
    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
npm --prefix frontend test -- AppHeader.test.ts
```

Expected: FAIL because `frontend/src/components/AppHeader.vue` does not exist.

- [ ] **Step 3: Implement `AppHeader.vue`**

Create `frontend/src/components/AppHeader.vue`:

```vue
<script setup lang="ts">
import {
  Bold,
  Code,
  FileText,
  Heading1,
  Italic,
  List,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Quote,
  Search,
  Settings,
  Sun,
} from '@lucide/vue'
import { ElButton, ElButtonGroup, ElTag, ElTooltip } from 'element-plus'
import type { SaveState, UtilityPanel } from '../types/app'
import type { ThemeMode } from '../lib/theme'

defineProps<{
  showSidebar: boolean
  theme: ThemeMode
  saveStatusText: string
  saveState: SaveState
}>()

defineEmits<{
  (event: 'toggle-sidebar'): void
  (event: 'insert-markdown', markdown: string): void
  (event: 'save'): void
  (event: 'toggle-theme'): void
  (event: 'open-utility', panel: UtilityPanel): void
}>()

const formatActions = [
  { key: 'heading', title: '标题', markdown: '# 标题', icon: Heading1 },
  { key: 'bold', title: '加粗', markdown: '**加粗文本**', icon: Bold },
  { key: 'italic', title: '斜体', markdown: '*斜体文本*', icon: Italic },
  { key: 'list', title: '列表', markdown: '- 列表项', icon: List },
  { key: 'quote', title: '引用', markdown: '> 引用', icon: Quote },
  { key: 'code', title: '代码', markdown: '`代码`', icon: Code },
]
</script>

<template>
  <header data-test="topbar" class="app-header">
    <div class="app-header__brand">
      <ElTooltip :content="showSidebar ? '隐藏文件树' : '显示文件树'" placement="bottom">
        <ElButton data-test="sidebar-toggle" circle text @click="$emit('toggle-sidebar')">
          <PanelLeftClose v-if="showSidebar" :size="18" />
          <PanelLeftOpen v-else :size="18" />
        </ElButton>
      </ElTooltip>
      <span data-test="brand-mark" class="brand-mark">D</span>
      <span class="brand-copy">
        <span class="brand-name">Donote</span>
        <span class="brand-subtitle">Markdown Notes</span>
      </span>
    </div>

    <ElButtonGroup data-test="format-toolbar" class="format-toolbar">
      <ElTooltip
        v-for="action in formatActions"
        :key="action.key"
        :content="action.title"
        placement="bottom"
      >
        <ElButton
          :data-test="`format-${action.key}`"
          @click="$emit('insert-markdown', action.markdown)"
        >
          <component :is="action.icon" :size="17" />
        </ElButton>
      </ElTooltip>
    </ElButtonGroup>

    <div class="app-header__spacer" />

    <ElTag v-if="saveStatusText" class="save-status" :type="saveState === 'error' ? 'danger' : saveState === 'dirty' ? 'warning' : 'info'">
      {{ saveStatusText }}
    </ElTag>

    <ElTooltip content="当前文档搜索" placement="bottom">
      <ElButton circle @click="$emit('open-utility', 'search')">
        <Search :size="18" />
      </ElButton>
    </ElTooltip>
    <ElTooltip content="立即保存" placement="bottom">
      <ElButton data-test="save-now" circle @click="$emit('save')">
        <FileText :size="18" />
      </ElButton>
    </ElTooltip>
    <ElTooltip content="设置" placement="bottom">
      <ElButton circle @click="$emit('open-utility', 'settings')">
        <Settings :size="18" />
      </ElButton>
    </ElTooltip>
    <ElTooltip :content="theme === 'dark' ? '切换浅色' : '切换深色'" placement="bottom">
      <ElButton data-test="theme-toggle" circle @click="$emit('toggle-theme')">
        <Sun v-if="theme === 'dark'" :size="18" />
        <Moon v-else :size="18" />
      </ElButton>
    </ElTooltip>
  </header>
</template>
```

- [ ] **Step 4: Wire `AppHeader` in `App.vue`**

Import `AppHeader`:

```ts
import AppHeader from './components/AppHeader.vue'
```

Replace the existing `<header data-test="topbar" ...>` block with:

```vue
<AppHeader
  :show-sidebar="showSidebar"
  :theme="theme"
  :save-status-text="saveStatusText"
  :save-state="activeSaveState"
  @toggle-sidebar="showSidebar = !showSidebar"
  @insert-markdown="insertMarkdown"
  @save="flushSave"
  @toggle-theme="switchTheme"
  @open-utility="toggleUtilityPanel"
/>
```

- [ ] **Step 5: Verify header tests**

Run:

```powershell
npm --prefix frontend test -- AppHeader.test.ts
```

Expected: PASS for `AppHeader.test.ts`.

- [ ] **Step 6: Commit header component**

Run:

```powershell
git add frontend/src/components/AppHeader.vue frontend/src/components/AppHeader.test.ts frontend/src/App.vue
git commit -m "Add Element Plus app header"
```

---

### Task 4: Build Workspace Sidebar With Element Plus Tree

**Files:**
- Create: `frontend/src/components/WorkspaceSidebar.vue`
- Create: `frontend/src/components/WorkspaceSidebar.test.ts`
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Write the failing sidebar tests**

Create `frontend/src/components/WorkspaceSidebar.test.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import WorkspaceSidebar from './WorkspaceSidebar.vue'

const tree = [
  {
    name: 'projects',
    path: 'projects',
    type: 'folder',
    children: [{ name: 'plan.md', path: 'projects/plan.md', type: 'file' }],
  },
]

describe('WorkspaceSidebar', () => {
  test('renders workspace controls and file tree', () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree: tree as any,
        activeFilePath: '',
        expandedFolderPaths: ['projects'],
      },
    })

    expect(wrapper.text()).toContain('notes')
    expect(wrapper.text()).toContain('打开文件夹')
    expect(wrapper.text()).toContain('projects')
    expect(wrapper.text()).toContain('plan.md')
  })

  test('emits open and create intents', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: '',
        tree: [],
        activeFilePath: '',
        expandedFolderPaths: [],
      },
    })

    await wrapper.get('[data-test="open-workspace"]').trigger('click')
    await wrapper.get('[data-test="new-note"]').trigger('click')

    expect(wrapper.emitted('open-workspace')).toHaveLength(1)
    expect(wrapper.emitted('create-note')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
npm --prefix frontend test -- WorkspaceSidebar.test.ts
```

Expected: FAIL because `WorkspaceSidebar.vue` does not exist.

- [ ] **Step 3: Implement `WorkspaceSidebar.vue`**

Create `frontend/src/components/WorkspaceSidebar.vue`:

```vue
<script setup lang="ts">
import { ChevronDown, ChevronRight, FilePlus, FileText, Folder, FolderOpen } from '@lucide/vue'
import { ElButton, ElEmpty, ElScrollbar, ElTree } from 'element-plus'
import type Node from 'element-plus/es/components/tree/src/model/node'
import type { main } from '../../wailsjs/go/models'

defineProps<{
  workspaceName: string
  tree: main.FileNode[]
  activeFilePath: string
  expandedFolderPaths: string[]
}>()

const emit = defineEmits<{
  (event: 'open-workspace'): void
  (event: 'create-note'): void
  (event: 'select-file', path: string): void
  (event: 'folder-expanded', path: string): void
  (event: 'folder-collapsed', path: string): void
}>()

const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: (data: main.FileNode) => data.type !== 'folder',
}

function handleNodeClick(node: main.FileNode) {
  if (node.type === 'file') {
    emit('select-file', node.path)
  }
}

function handleNodeExpand(node: main.FileNode) {
  if (node.type === 'folder') emit('folder-expanded', node.path)
}

function handleNodeCollapse(node: main.FileNode) {
  if (node.type === 'folder') emit('folder-collapsed', node.path)
}
</script>

<template>
  <aside class="workspace-sidebar">
    <div class="sidebar-actions">
      <ElButton data-test="open-workspace" type="primary" @click="$emit('open-workspace')">
        <FolderOpen :size="16" />
        <span>打开文件夹</span>
      </ElButton>
      <ElButton data-test="new-note" circle @click="$emit('create-note')">
        <FilePlus :size="17" />
      </ElButton>
    </div>

    <div v-if="workspaceName" class="workspace-title">
      <Folder :size="16" />
      <span>{{ workspaceName }}</span>
    </div>
    <ElEmpty v-else class="sidebar-empty" description="还没有打开笔记文件夹" :image-size="56" />

    <ElScrollbar v-if="tree.length" class="file-tree-scroll">
      <ElTree
        class="file-tree"
        :data="tree"
        node-key="path"
        :props="treeProps"
        :current-node-key="activeFilePath"
        :default-expanded-keys="expandedFolderPaths"
        highlight-current
        @node-click="handleNodeClick"
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template #default="{ node, data }: { node: Node; data: main.FileNode }">
          <span
            class="file-tree-node"
            :data-test="data.type === 'file' ? `file-${data.path}` : `folder-${data.path}`"
          >
            <ChevronRight v-if="data.type === 'folder' && !node.expanded" :size="14" />
            <ChevronDown v-else-if="data.type === 'folder'" :size="14" />
            <FileText v-else :size="14" />
            <span class="file-tree-node__name">{{ data.name }}</span>
          </span>
        </template>
      </ElTree>
    </ElScrollbar>
  </aside>
</template>
```

- [ ] **Step 4: Add App helpers for expanded folder keys**

In `App.vue`, add:

```ts
const expandedFolderPaths = computed(() =>
  workspace.value ? collectFolderPaths(workspace.value.tree).filter((path) => !collapsedFolderPaths.value.has(path)) : [],
)

function collectFolderPaths(nodes: main.FileNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type !== 'folder') return []
    return [node.path, ...collectFolderPaths(node.children ?? [])]
  })
}

function setFolderCollapsed(path: string, collapsed: boolean) {
  if (!workspace.value) return
  const next = new Set(collapsedFolderPaths.value)
  if (collapsed) next.add(path)
  else next.delete(path)
  collapsedFolderPaths.value = next
  saveCollapsedFolderPaths(workspace.value.rootPath, [...next])
}
```

- [ ] **Step 5: Wire `WorkspaceSidebar` in `App.vue`**

Import:

```ts
import WorkspaceSidebar from './components/WorkspaceSidebar.vue'
```

Replace the existing `<aside v-if="showSidebar" class="sidebar">...</aside>` block with:

```vue
<WorkspaceSidebar
  v-if="showSidebar"
  :workspace-name="workspace?.name ?? ''"
  :tree="workspace?.tree ?? []"
  :active-file-path="activeFilePath"
  :expanded-folder-paths="expandedFolderPaths"
  @open-workspace="openWorkspace"
  @create-note="createNote"
  @select-file="selectFile"
  @folder-expanded="setFolderCollapsed($event, false)"
  @folder-collapsed="setFolderCollapsed($event, true)"
/>
```

Keep the existing `flattenTree`, `toggleFolder`, and `isFolderCollapsed` functions until App tests pass, then remove them if they are unused.

- [ ] **Step 6: Verify sidebar tests and app tests**

Run:

```powershell
npm --prefix frontend test -- WorkspaceSidebar.test.ts App.test.ts
```

Expected: `WorkspaceSidebar.test.ts` passes. `App.test.ts` may need selector updates from old tree buttons to Element Plus tree slots; update selectors to continue using `data-test="file-..."` and `data-test="folder-..."`.

- [ ] **Step 7: Commit sidebar component**

Run:

```powershell
git add frontend/src/components/WorkspaceSidebar.vue frontend/src/components/WorkspaceSidebar.test.ts frontend/src/App.vue frontend/src/App.test.ts
git commit -m "Add Element Plus workspace sidebar"
```

---

### Task 5: Build Document Tabs And Editor Surface

**Files:**
- Create: `frontend/src/components/DocumentTabs.vue`
- Create: `frontend/src/components/EditorSurface.vue`
- Create: `frontend/src/components/DocumentTabs.test.ts`
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Write the failing document tabs tests**

Create `frontend/src/components/DocumentTabs.test.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import DocumentTabs from './DocumentTabs.vue'

const documents = [
  { path: 'intro.md', name: 'intro.md', content: '# Intro', savedContent: '# Intro', saving: false, error: '' },
  { path: 'draft.md', name: 'draft.md', content: '# Draft changed', savedContent: '# Draft', saving: false, error: '' },
]

describe('DocumentTabs', () => {
  test('renders active and dirty tabs', () => {
    const wrapper = mount(DocumentTabs, {
      props: {
        documents,
        activePath: 'draft.md',
      },
    })

    expect(wrapper.text()).toContain('intro.md')
    expect(wrapper.text()).toContain('draft.md')
    expect(wrapper.text()).toContain('*')
  })

  test('emits switch and close events', async () => {
    const wrapper = mount(DocumentTabs, {
      props: {
        documents,
        activePath: 'intro.md',
      },
    })

    wrapper.findComponent({ name: 'ElTabs' }).vm.$emit('update:modelValue', 'draft.md')
    await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')

    expect(wrapper.emitted('update:activePath')?.[0]).toEqual(['draft.md'])
    expect(wrapper.emitted('close')?.[0]).toEqual([documents[0]])
  })
})
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
npm --prefix frontend test -- DocumentTabs.test.ts
```

Expected: FAIL because `DocumentTabs.vue` does not exist.

- [ ] **Step 3: Implement `DocumentTabs.vue`**

Create `frontend/src/components/DocumentTabs.vue`:

```vue
<script setup lang="ts">
import { FileText, X } from '@lucide/vue'
import { ElTabs, ElTabPane } from 'element-plus'
import type { OpenDocument } from '../types/app'

const props = defineProps<{
  documents: OpenDocument[]
  activePath: string
}>()

const emit = defineEmits<{
  (event: 'update:activePath', path: string): void
  (event: 'close', document: OpenDocument): void
}>()

function isDirty(document: OpenDocument): boolean {
  return document.content.replace(/\s+$/g, '') !== document.savedContent.replace(/\s+$/g, '')
}

function handleTabChange(path: string | number) {
  emit('update:activePath', String(path))
}
</script>

<template>
  <ElTabs
    v-if="documents.length"
    class="document-tabs"
    type="card"
    :model-value="activePath"
    @update:model-value="handleTabChange"
  >
    <ElTabPane v-for="document in props.documents" :key="document.path" :name="document.path">
      <template #label>
        <span :data-test="`tab-${document.path}`" class="document-tab-label">
          <FileText :size="14" />
          <span>{{ document.name }}</span>
          <span v-if="isDirty(document)" class="dirty-mark">*</span>
          <button
            class="tab-close-button"
            :data-test="`tab-close-${document.path}`"
            type="button"
            :title="`关闭 ${document.name}`"
            @click.stop="emit('close', document)"
          >
            <X :size="13" />
          </button>
        </span>
      </template>
    </ElTabPane>
  </ElTabs>
</template>
```

- [ ] **Step 4: Implement `EditorSurface.vue`**

Create `frontend/src/components/EditorSurface.vue`:

```vue
<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import { ElButton, ElEmpty, ElScrollbar, ElTooltip } from 'element-plus'
import type { OpenDocument } from '../types/app'
import MilkdownEditor from './MilkdownEditor.vue'

defineProps<{
  document: OpenDocument | null
  modelValue: string
}>()

defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'rename'): void
  (event: 'delete'): void
  (event: 'open-workspace'): void
}>()
</script>

<template>
  <section class="editor-surface">
    <template v-if="document">
      <div class="document-toolbar">
        <div class="document-heading">
          <p class="document-label">当前笔记</p>
          <h1>{{ document.name }}</h1>
        </div>
        <div class="document-actions">
          <ElTooltip content="重命名" placement="bottom">
            <ElButton circle @click="$emit('rename')">
              <Pencil :size="17" />
            </ElButton>
          </ElTooltip>
          <ElTooltip content="删除" placement="bottom">
            <ElButton circle type="danger" @click="$emit('delete')">
              <Trash2 :size="17" />
            </ElButton>
          </ElTooltip>
        </div>
      </div>

      <ElScrollbar class="milkdown-shell">
        <div class="milkdown-editor">
          <MilkdownEditor
            :model-value="modelValue"
            :active-path="document.path"
            @update:model-value="$emit('update:modelValue', $event)"
          />
        </div>
      </ElScrollbar>
    </template>

    <ElEmpty v-else class="empty-state" description="选择一个笔记文件夹开始写作">
      <ElButton type="primary" @click="$emit('open-workspace')">打开文件夹</ElButton>
    </ElEmpty>
  </section>
</template>
```

- [ ] **Step 5: Wire tabs and editor surface in `App.vue`**

Import:

```ts
import DocumentTabs from './components/DocumentTabs.vue'
import EditorSurface from './components/EditorSurface.vue'
```

Replace the existing document tabs, document toolbar, `MilkdownEditor`, and empty state blocks with:

```vue
<main class="editor-pane">
  <DocumentTabs
    :documents="openDocuments"
    :active-path="activeFilePath"
    @update:active-path="switchDocument"
    @close="closeDocument"
  />

  <EditorSurface
    v-model="editorContent"
    :document="activeDocument"
    @rename="renameActiveDocument"
    @delete="deleteActiveDocument"
    @open-workspace="openWorkspace"
  />
</main>
```

- [ ] **Step 6: Verify tab and app workflow tests**

Run:

```powershell
npm --prefix frontend test -- DocumentTabs.test.ts App.test.ts
```

Expected: Document tab tests pass. App tests for opening multiple files, preserving drafts, closing clean tabs, closing dirty tabs, and Ctrl+S still pass after selector updates.

- [ ] **Step 7: Commit tabs and editor surface**

Run:

```powershell
git add frontend/src/components/DocumentTabs.vue frontend/src/components/DocumentTabs.test.ts frontend/src/components/EditorSurface.vue frontend/src/App.vue frontend/src/App.test.ts
git commit -m "Add Element Plus document workspace"
```

---

### Task 6: Build Utility Rail, Drawer, Outline, Search, And Settings Panels

**Files:**
- Create: `frontend/src/components/UtilityRail.vue`
- Create: `frontend/src/components/UtilityDrawer.vue`
- Create: `frontend/src/components/OutlinePanel.vue`
- Create: `frontend/src/components/SearchPanel.vue`
- Create: `frontend/src/components/SettingsPanel.vue`
- Create: `frontend/src/components/UtilityRail.test.ts`
- Modify: `frontend/src/App.vue`

- [ ] **Step 1: Write the failing utility rail test**

Create `frontend/src/components/UtilityRail.test.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import UtilityRail from './UtilityRail.vue'

describe('UtilityRail', () => {
  test('renders utility buttons and emits selected panel', async () => {
    const wrapper = mount(UtilityRail, {
      props: {
        activePanel: 'outline',
        drawerOpen: false,
      },
    })

    await wrapper.get('[data-test="utility-search"]').trigger('click')
    await wrapper.get('[data-test="utility-settings"]').trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual(['search'])
    expect(wrapper.emitted('select')?.[1]).toEqual(['settings'])
  })
})
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
npm --prefix frontend test -- UtilityRail.test.ts
```

Expected: FAIL because `UtilityRail.vue` does not exist.

- [ ] **Step 3: Implement `UtilityRail.vue`**

Create `frontend/src/components/UtilityRail.vue`:

```vue
<script setup lang="ts">
import { ListTree, Search, Settings } from '@lucide/vue'
import { ElButton, ElTooltip } from 'element-plus'
import type { UtilityPanel } from '../types/app'

defineProps<{
  activePanel: UtilityPanel
  drawerOpen: boolean
}>()

defineEmits<{
  (event: 'select', panel: UtilityPanel): void
}>()

const tools: Array<{ key: UtilityPanel; label: string; icon: typeof ListTree }> = [
  { key: 'outline', label: '大纲', icon: ListTree },
  { key: 'search', label: '搜索', icon: Search },
  { key: 'settings', label: '设置', icon: Settings },
]
</script>

<template>
  <aside class="utility-rail">
    <ElTooltip v-for="tool in tools" :key="tool.key" :content="tool.label" placement="left">
      <ElButton
        :data-test="`utility-${tool.key}`"
        circle
        :type="drawerOpen && activePanel === tool.key ? 'primary' : 'default'"
        @click="$emit('select', tool.key)"
      >
        <component :is="tool.icon" :size="18" />
      </ElButton>
    </ElTooltip>
  </aside>
</template>
```

- [ ] **Step 4: Implement panel components**

Create `frontend/src/components/OutlinePanel.vue`:

```vue
<script setup lang="ts">
import { ElEmpty, ElScrollbar } from 'element-plus'
import type { OutlineItem } from '../lib/outline'

defineProps<{
  items: OutlineItem[]
}>()
</script>

<template>
  <ElScrollbar class="utility-panel-scroll">
    <div class="utility-panel">
      <h2>大纲</h2>
      <div v-if="items.length" class="outline-list">
        <button
          v-for="item in items"
          :key="item.id"
          class="outline-row"
          type="button"
          :style="{ paddingLeft: `${8 + (item.level - 1) * 14}px` }"
        >
          {{ item.text }}
        </button>
      </div>
      <ElEmpty v-else description="当前笔记没有标题" :image-size="56" />
    </div>
  </ElScrollbar>
</template>
```

Create `frontend/src/components/SearchPanel.vue`:

```vue
<script setup lang="ts">
import { Search } from '@lucide/vue'
import { ElButton, ElInput } from 'element-plus'
import type { SearchResult } from '../lib/search'

defineProps<{
  query: string
  result: SearchResult
  activeIndex: number
}>()

defineEmits<{
  (event: 'update:query', value: string): void
  (event: 'previous'): void
  (event: 'next'): void
}>()
</script>

<template>
  <div class="utility-panel search-panel">
    <h2>搜索</h2>
    <ElInput
      :model-value="query"
      data-test="search-input"
      placeholder="在当前笔记中搜索"
      clearable
      @update:model-value="$emit('update:query', String($event))"
    >
      <template #prefix>
        <Search :size="16" />
      </template>
    </ElInput>
    <div class="search-actions">
      <span class="search-count">
        {{ result.matches.length ? `${activeIndex + 1}/${result.matches.length}` : '0/0' }}
      </span>
      <ElButton @click="$emit('previous')">上一个</ElButton>
      <ElButton @click="$emit('next')">下一个</ElButton>
    </div>
  </div>
</template>
```

Create `frontend/src/components/SettingsPanel.vue`:

```vue
<script setup lang="ts">
import { ElButton, ElForm, ElFormItem, ElSlider } from 'element-plus'
import {
  layoutFontSizeControls,
  type LayoutFontSizeArea,
  type LayoutFontSizes,
} from '../lib/layoutFontSizes'

defineProps<{
  modelValue: LayoutFontSizes
}>()

defineEmits<{
  (event: 'update-font-size', area: LayoutFontSizeArea, value: number): void
  (event: 'cancel'): void
  (event: 'save'): void
}>()
</script>

<template>
  <div class="utility-panel settings-panel">
    <h2>设置</h2>
    <p class="panel-subtitle">布局字体大小</p>
    <ElForm label-position="top">
      <ElFormItem v-for="control in layoutFontSizeControls" :key="control.key" :label="control.label">
        <ElSlider
          :data-test="`font-size-${control.key}`"
          :model-value="modelValue[control.key]"
          :min="control.min"
          :max="control.max"
          show-input
          @update:model-value="$emit('update-font-size', control.key, Number($event))"
        />
      </ElFormItem>
    </ElForm>
    <div class="settings-actions">
      <ElButton @click="$emit('cancel')">取消</ElButton>
      <ElButton data-test="settings-save" type="primary" @click="$emit('save')">保存</ElButton>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Implement `UtilityDrawer.vue`**

Create `frontend/src/components/UtilityDrawer.vue`:

```vue
<script setup lang="ts">
import { ElDrawer } from 'element-plus'
import type { LayoutFontSizeArea, LayoutFontSizes } from '../lib/layoutFontSizes'
import type { SearchResult } from '../lib/search'
import type { OutlineItem } from '../lib/outline'
import type { UtilityPanel } from '../types/app'
import OutlinePanel from './OutlinePanel.vue'
import SearchPanel from './SearchPanel.vue'
import SettingsPanel from './SettingsPanel.vue'

defineProps<{
  modelValue: boolean
  activePanel: UtilityPanel
  outline: OutlineItem[]
  searchQuery: string
  searchResult: SearchResult
  activeSearchIndex: number
  draftLayoutFontSizes: LayoutFontSizes
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'update:searchQuery', value: string): void
  (event: 'previous-match'): void
  (event: 'next-match'): void
  (event: 'update-font-size', area: LayoutFontSizeArea, value: number): void
  (event: 'cancel-settings'): void
  (event: 'save-settings'): void
}>()

const titles: Record<UtilityPanel, string> = {
  outline: '大纲',
  search: '搜索',
  settings: '设置',
}

function emitFontSize(area: LayoutFontSizeArea, value: number) {
  emit('update-font-size', area, value)
}
</script>

<template>
  <ElDrawer
    class="utility-drawer"
    :model-value="modelValue"
    :title="titles[activePanel]"
    direction="rtl"
    size="320px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <OutlinePanel v-if="activePanel === 'outline'" :items="outline" />
    <SearchPanel
      v-else-if="activePanel === 'search'"
      :query="searchQuery"
      :result="searchResult"
      :active-index="activeSearchIndex"
      @update:query="$emit('update:searchQuery', $event)"
      @previous="$emit('previous-match')"
      @next="$emit('next-match')"
    />
    <SettingsPanel
      v-else
      :model-value="draftLayoutFontSizes"
      @update-font-size="emitFontSize"
      @cancel="$emit('cancel-settings')"
      @save="$emit('save-settings')"
    />
  </ElDrawer>
</template>
```

- [ ] **Step 6: Wire utility rail and drawer in `App.vue`**

Import:

```ts
import UtilityDrawer from './components/UtilityDrawer.vue'
import UtilityRail from './components/UtilityRail.vue'
```

Add to the workspace shell after the editor pane:

```vue
<UtilityRail
  :active-panel="activeUtilityPanel"
  :drawer-open="showUtilityDrawer"
  @select="toggleUtilityPanel"
/>
<UtilityDrawer
  v-model="showUtilityDrawer"
  :active-panel="activeUtilityPanel"
  :outline="outline"
  v-model:search-query="searchQuery"
  :search-result="searchResult"
  :active-search-index="activeSearchIndex"
  :draft-layout-font-sizes="draftLayoutFontSizes"
  @previous-match="goToPreviousMatch"
  @next-match="goToNextMatch"
  @update-font-size="setDraftLayoutFontSize"
  @cancel-settings="closeSettings"
  @save-settings="saveSettings"
/>
```

Remove the old floating search bar, settings modal, and always-visible outline panel template blocks after the new drawer passes tests.

- [ ] **Step 7: Verify utility tests and app settings/search tests**

Run:

```powershell
npm --prefix frontend test -- UtilityRail.test.ts App.test.ts
```

Expected: Utility rail test passes. App tests for layout font settings still prove settings are staged until save; search opens through the utility rail instead of the old floating search bar.

- [ ] **Step 8: Commit utility rail and drawer**

Run:

```powershell
git add frontend/src/components/UtilityRail.vue frontend/src/components/UtilityRail.test.ts frontend/src/components/UtilityDrawer.vue frontend/src/components/OutlinePanel.vue frontend/src/components/SearchPanel.vue frontend/src/components/SettingsPanel.vue frontend/src/App.vue frontend/src/App.test.ts
git commit -m "Add right utility rail and drawer"
```

---

### Task 7: Replace Native Prompt And Confirm With Element Plus Flows

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/App.test.ts`

- [ ] **Step 1: Update tests for Element Plus dirty-close confirmation**

In `frontend/src/App.test.ts`, mock Element Plus message box near existing mocks:

```ts
const confirmMock = vi.fn()
const messageErrorMock = vi.fn()

vi.mock('element-plus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('element-plus')>()
  return {
    ...actual,
    ElMessageBox: {
      confirm: confirmMock,
      prompt: vi.fn(),
    },
    ElMessage: {
      error: messageErrorMock,
      success: vi.fn(),
    },
  }
})
```

Change dirty close tests so cancellation rejects:

```ts
confirmMock.mockRejectedValueOnce(new Error('cancel'))
await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')
await flushPromises()
expect(confirmMock).toHaveBeenCalled()
expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(true)
```

Then acceptance resolves:

```ts
confirmMock.mockResolvedValueOnce('confirm')
await wrapper.get('[data-test="tab-close-intro.md"]').trigger('click')
await flushPromises()
expect(wrapper.find('[data-test="tab-intro.md"]').exists()).toBe(false)
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
npm --prefix frontend test -- App.test.ts
```

Expected: FAIL because `App.vue` still calls `window.confirm`.

- [ ] **Step 3: Import Element Plus feedback APIs in `App.vue`**

Add:

```ts
import { ElMessage, ElMessageBox } from 'element-plus'
```

- [ ] **Step 4: Replace dirty close confirmation**

Change `closeDocument` to:

```ts
async function closeDocument(document: OpenDocument) {
  if (isDocumentDirty(document)) {
    try {
      await ElMessageBox.confirm(
        `「${document.name}」有未保存更改，关闭后将丢失。确认关闭？`,
        '关闭未保存笔记',
        { type: 'warning', confirmButtonText: '关闭', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
  }

  const closedIndex = openDocuments.value.findIndex((item) => item.path === document.path)
  openDocuments.value = openDocuments.value.filter((item) => item.path !== document.path)

  if (activeDocumentPath.value !== document.path) {
    return
  }

  activeDocumentPath.value =
    openDocuments.value[closedIndex]?.path ??
    openDocuments.value[Math.max(0, closedIndex - 1)]?.path ??
    ''
}
```

- [ ] **Step 5: Replace delete confirmation**

Change `deleteActiveDocument` confirmation block to:

```ts
try {
  await ElMessageBox.confirm(
    `删除「${document.name}」？此操作无法撤销。`,
    '删除笔记',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
} catch {
  return
}
```

Keep the existing `DeletePath`, reload tree, and active tab selection logic after the confirmation.

- [ ] **Step 6: Replace API error feedback**

Change `setError` to:

```ts
function setError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  errorMessage.value = message
  ElMessage.error(message)
}
```

- [ ] **Step 7: Verify confirmation tests**

Run:

```powershell
npm --prefix frontend test -- App.test.ts
```

Expected: App tests pass with Element Plus confirmation mocks.

- [ ] **Step 8: Commit Element Plus feedback flows**

Run:

```powershell
git add frontend/src/App.vue frontend/src/App.test.ts
git commit -m "Use Element Plus feedback dialogs"
```

---

### Task 8: Apply Calm Writing Tool Styling

**Files:**
- Modify: `frontend/src/style.css`
- Modify: component class names only if required by CSS.

- [ ] **Step 1: Replace global layout CSS**

In `frontend/src/style.css`, keep the root color tokens and replace old shell selectors with this layout foundation:

```css
:root {
  color-scheme: light;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  background: #f4f6f8;
  color: #1f2937;
  --app-bg: #f4f6f8;
  --surface: #ffffff;
  --surface-muted: #f8fafc;
  --border: #dfe5ec;
  --text: #1f2937;
  --text-muted: #667085;
  --text-subtle: #98a2b3;
  --accent: #14b8a6;
  --accent-soft: #dff7f3;
  --danger: #d92d20;
  --shadow-soft: 0 18px 42px rgba(31, 41, 55, 0.08);
  --sidebar-font-size: 13px;
  --editor-font-size: 17px;
  --outline-font-size: 13px;
}

:root[data-theme='dark'] {
  color-scheme: dark;
  background: #111827;
  color: #e5eefb;
  --app-bg: #111827;
  --surface: #1f2937;
  --surface-muted: #172033;
  --border: #334155;
  --text: #e5eefb;
  --text-muted: #b8c4d6;
  --text-subtle: #7f8ea3;
  --accent: #5eead4;
  --accent-soft: #134e4a;
  --danger: #ff8b81;
  --shadow-soft: 0 18px 42px rgba(0, 0, 0, 0.32);
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  min-width: 960px;
  height: 100vh;
  margin: 0;
  overflow: hidden;
}

body {
  background: var(--app-bg);
  color: var(--text);
}

.app-shell {
  height: 100vh;
  background: var(--app-bg);
}

.workspace-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 48px;
  height: calc(100vh - 56px);
  min-height: 0;
}

.workspace-layout.without-sidebar {
  grid-template-columns: minmax(0, 1fr) 48px;
}
```

- [ ] **Step 2: Add Element Plus token overrides**

Append:

```css
:root {
  --el-color-primary: var(--accent);
  --el-border-radius-base: 8px;
  --el-font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.el-button {
  letter-spacing: 0;
}

.el-drawer__header {
  margin-bottom: 0;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}

.el-drawer__body {
  padding: 0;
}
```

- [ ] **Step 3: Add component layout CSS**

Append CSS for the new component classes:

```css
.app-header {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.app-header__brand,
.brand-copy,
.workspace-title,
.file-tree-node,
.document-tab-label,
.document-toolbar,
.document-actions,
.search-actions,
.settings-actions {
  display: flex;
  align-items: center;
}

.app-header__brand {
  gap: 10px;
  min-width: 248px;
}

.app-header__spacer {
  flex: 1;
}

.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
}

.brand-copy {
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
}

.brand-name {
  font-size: 15px;
  font-weight: 750;
}

.brand-subtitle {
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 650;
}

.workspace-sidebar,
.utility-rail {
  min-height: 0;
  border-right: 1px solid var(--border);
  background: var(--surface-muted);
}

.workspace-sidebar {
  font-size: var(--sidebar-font-size);
}

.sidebar-actions {
  display: flex;
  gap: 8px;
  padding: 14px;
}

.workspace-title {
  gap: 8px;
  margin: 0 12px 8px;
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  font-weight: 800;
}

.file-tree-scroll {
  height: calc(100vh - 146px);
  padding: 0 8px 12px;
}

.file-tree {
  background: transparent;
}

.file-tree-node {
  min-width: 0;
  gap: 8px;
  width: 100%;
}

.file-tree-node__name,
.document-tab-label span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  background: var(--app-bg);
  font-size: var(--editor-font-size);
}

.document-tabs {
  min-width: 0;
  padding: 10px 18px 0;
  background: var(--surface-muted);
}

.document-tab-label {
  gap: 7px;
  max-width: 180px;
}

.dirty-mark {
  color: #b7791f;
}

.editor-surface {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
}

.document-toolbar {
  justify-content: space-between;
  gap: 12px;
  padding: 16px 32px 12px;
}

.document-label,
.document-heading h1 {
  margin: 0;
}

.document-label {
  margin-bottom: 4px;
  color: var(--text-subtle);
  font-size: 11px;
  font-weight: 800;
}

.document-heading h1 {
  color: var(--text);
  font-size: 18px;
}

.milkdown-shell {
  min-height: 0;
  padding: 0 32px 46px;
}

.milkdown-editor {
  max-width: 900px;
  min-height: calc(100vh - 172px);
  margin: 0 auto;
  padding: 40px 56px 60px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.utility-rail {
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 10px;
  padding: 12px 0;
  border-right: 0;
  border-left: 1px solid var(--border);
}

.utility-panel {
  padding: 18px;
}

.utility-panel h2 {
  margin: 0 0 14px;
  font-size: 16px;
}

.panel-subtitle {
  margin: -8px 0 16px;
  color: var(--text-subtle);
  font-size: 12px;
}

.outline-list {
  display: grid;
  gap: 4px;
}

.outline-row {
  min-height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  text-align: left;
  cursor: pointer;
}

.outline-row:hover {
  background: var(--accent-soft);
  color: var(--text);
}
```

- [ ] **Step 4: Verify the build catches CSS and template issues**

Run:

```powershell
npm --prefix frontend run build
```

Expected: Build succeeds with no Vue template or TypeScript errors.

- [ ] **Step 5: Commit styling**

Run:

```powershell
git add frontend/src/style.css
git commit -m "Apply calm Element Plus layout styling"
```

---

### Task 9: Update App Integration Tests For The New Shell

**Files:**
- Modify: `frontend/src/App.test.ts`

- [ ] **Step 1: Replace old chrome test expectations**

Update the chrome test to assert Element Plus-era structure:

```ts
test('renders modern Element Plus app chrome', () => {
  const wrapper = mount(App)

  expect(wrapper.get('[data-test="topbar"]').classes()).toContain('app-header')
  expect(wrapper.get('[data-test="format-toolbar"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="brand-mark"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="utility-outline"]').exists()).toBe(true)
})
```

- [ ] **Step 2: Update settings test to open the right drawer**

Change the settings test setup from clicking `[data-test="settings-toggle"]` to:

```ts
await wrapper.get('[data-test="utility-settings"]').trigger('click')

expect(wrapper.find('[data-test="settings-page"]').exists()).toBe(false)
expect(wrapper.text()).toContain('布局字体大小')
```

Keep the existing slider changes and save assertion:

```ts
await wrapper.get('[data-test="font-size-sidebar"]').setValue(12)
await wrapper.get('[data-test="font-size-editor"]').setValue(19)
await wrapper.get('[data-test="font-size-outline"]').setValue(14)
await wrapper.get('[data-test="settings-save"]').trigger('click')
```

- [ ] **Step 3: Assert custom tab close selectors**

Keep `DocumentTabs.vue` on the custom close button implemented in Task 5:

```vue
<button
  class="tab-close-button"
  :data-test="`tab-close-${document.path}`"
  type="button"
  :title="`关闭 ${document.name}`"
  @click.stop="emit('close', document)"
>
  <X :size="13" />
</button>
```

Update App tests to continue closing tabs through `data-test="tab-close-..."` selectors. Do not assert Element Plus internal close icon markup.

- [ ] **Step 4: Run full frontend tests**

Run:

```powershell
npm --prefix frontend test
```

Expected: All Vitest tests pass. The expected final count is at least the previous 7 test files and 28 tests, plus any new component tests added by this plan.

- [ ] **Step 5: Commit integration tests**

Run:

```powershell
git add frontend/src/App.test.ts frontend/src/components/DocumentTabs.vue
git commit -m "Update app tests for Element Plus shell"
```

---

### Task 10: Final Verification And Wails Compatibility

**Files:**
- Modify only if verification reveals required generated metadata updates.

- [ ] **Step 1: Run backend tests**

Run:

```powershell
go test ./...
```

Expected: `ok   donote` with exit code 0.

- [ ] **Step 2: Run frontend tests**

Run:

```powershell
npm --prefix frontend test
```

Expected: All frontend tests pass with no unhandled promise rejections.

- [ ] **Step 3: Run frontend build**

Run:

```powershell
npm --prefix frontend run build
```

Expected: `vue-tsc --noEmit` and `vite build` both complete with exit code 0.

- [ ] **Step 4: Run the app for visual verification**

Run:

```powershell
wails dev
```

Expected: The desktop app opens. Verify these states manually:

- Empty state shows a clean Element Plus shell.
- Opening a workspace renders the left Element Plus file tree.
- Opening a note renders tabs and the centered Milkdown document surface.
- Right utility rail opens outline, search, and settings drawers.
- Dark theme toggles Element Plus and custom surfaces coherently.
- Long file names and tab names truncate instead of shifting layout.

- [ ] **Step 5: Inspect git changes**

Run:

```powershell
git status --short
git diff --stat
```

Expected: Only intended frontend source, tests, dependency metadata, and generated Wails metadata if actually changed are present.

- [ ] **Step 6: Commit final verification fixes**

If Step 5 shows intended uncommitted changes, run:

```powershell
git add frontend
git commit -m "Finish Element Plus layout redesign"
```

If Step 5 shows no uncommitted changes, do not create an empty commit.

---

## Self-Review Notes

Spec coverage:

- Full Element Plus migration: Tasks 1, 3, 4, 5, 6, 7, and 8.
- Calm writing tool style: Task 8.
- Right utility rail information architecture: Task 6.
- Componentized migration: Tasks 3 through 6.
- Wails API calls centralized in `App.vue`: Tasks 2 through 7 keep backend calls in `App.vue`.
- Existing editing and workspace behavior: Tasks 4, 5, 7, and 9 update integration tests for the same workflows.
- Error handling with Element Plus feedback: Task 7.
- Verification commands and visual checks: Task 10.

Implementation notes:

- Do not commit `.superpowers/`; it contains brainstorming mockup session files.
- Keep generated `frontend/wailsjs` files untouched unless Wails regenerates them as part of a required workflow.
- If an Element Plus component renders markup that makes existing selectors brittle, add stable `data-test` attributes in the wrapper component rather than asserting Element Plus internals.
