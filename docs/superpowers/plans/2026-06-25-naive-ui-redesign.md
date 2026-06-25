# Donote Naive UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Element Plus with Naive UI and custom Donote shell styling while preserving existing note workflows.

**Architecture:** Keep `App.vue` as the Wails workflow orchestrator and migrate UI controls behind stable component boundaries. Use Naive UI for shared controls and overlays, custom native-button components for the workspace tree and document tabs, and CSS variables for light/dark visual tokens.

**Tech Stack:** Wails, Vue 3, TypeScript, Vite, Vitest, Vue Test Utils, Naive UI, lucide-vue, Milkdown.

---

## File Structure

- Modify `frontend/package.json` and `frontend/package-lock.json`: add `naive-ui`, remove `element-plus` after migration.
- Modify `frontend/src/main.ts`: final cleanup removes Element Plus CSS imports in Task 8.
- Modify `frontend/src/App.vue`: replace Element Plus message, prompt, and confirm calls; render Naive provider and prompt host.
- Modify `frontend/src/App.test.ts`: replace Element Plus mocks with the new Donote feedback mocks and update DOM assumptions.
- Create `frontend/src/lib/naiveTheme.ts`: centralize Naive UI theme overrides.
- Create `frontend/src/lib/naiveTheme.test.ts`: verify Naive UI theme override values.
- Create `frontend/src/lib/appFeedback.ts`: centralize message, confirm, and prompt contracts for App-level feedback.
- Create `frontend/src/components/AppProviders.vue`: wrap the app shell with `NConfigProvider`, `NDialogProvider`, and `NMessageProvider`.
- Create `frontend/src/components/PromptDialog.vue`: app-controlled text input dialog for create and rename flows.
- Modify `frontend/src/components/CommandToolbar.vue`: migrate toolbar controls to Naive UI.
- Modify `frontend/src/components/FormatToolbar.vue`: migrate format controls to Naive UI.
- Modify `frontend/src/components/WorkspaceSidebar.vue`: replace `ElTree` with a custom recursive tree.
- Create `frontend/src/components/WorkspaceTreeNode.vue`: focused recursive tree row renderer.
- Modify `frontend/src/components/DocumentTabs.vue`: replace `ElTabs` with a custom tab strip.
- Modify `frontend/src/components/SearchPanel.vue`: migrate search controls to Naive UI.
- Modify `frontend/src/components/UtilityDrawer.vue`: migrate drawer to Naive UI.
- Modify `frontend/src/components/SettingsPanel.vue`: migrate settings form controls to Naive UI.
- Modify `frontend/src/components/OutlinePanel.vue`: migrate scrollbar and empty state.
- Modify `frontend/src/components/EditorSurface.vue`: replace empty state.
- Modify `frontend/src/style.css` and `frontend/src/style.test.ts`: remove Element Plus selectors, keep Donote shell tokens and component classes.
- Modify component tests next to changed behavior.

## Task 1: Add Naive UI Dependency And Root Theme Infrastructure

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/src/lib/naiveTheme.ts`
- Create: `frontend/src/lib/naiveTheme.test.ts`
- Create: `frontend/src/components/AppProviders.vue`

- [ ] **Step 1: Install Naive UI**

Run:

```powershell
npm --prefix frontend install naive-ui
```

Expected: `frontend/package.json` contains `naive-ui` in `dependencies`, and `frontend/package-lock.json` is updated.

- [ ] **Step 2: Write a failing theme override test**

Create `frontend/src/lib/naiveTheme.test.ts`:

```ts
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
```

Run:

```powershell
npm --prefix frontend test -- src/lib/naiveTheme.test.ts
```

Expected: FAIL because `frontend/src/lib/naiveTheme.ts` does not exist yet.

- [ ] **Step 3: Create Naive theme overrides**

Create `frontend/src/lib/naiveTheme.ts`:

```ts
import type { GlobalThemeOverrides } from 'naive-ui'
import type { ThemeMode } from './theme'

export function createNaiveThemeOverrides(mode: ThemeMode): GlobalThemeOverrides {
  const isDark = mode === 'dark'
  return {
    common: {
      borderRadius: '8px',
      borderRadiusSmall: '6px',
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primaryColor: isDark ? '#c5ccd1' : '#0f766e',
      primaryColorHover: isDark ? '#d5dadd' : '#0d9488',
      primaryColorPressed: isDark ? '#aab4bc' : '#0f766e',
      primaryColorSuppl: isDark ? '#8f9ba3' : '#14b8a6',
      textColorBase: isDark ? '#e8e8e8' : '#1f2937',
      textColor1: isDark ? '#e8e8e8' : '#1f2937',
      textColor2: isDark ? '#c5ccd1' : '#5f6b7a',
      textColor3: isDark ? '#a6a6a6' : '#8a96a6',
      bodyColor: isDark ? '#050505' : '#f4f6f8',
      cardColor: isDark ? '#0c0c0c' : '#ffffff',
      modalColor: isDark ? '#151515' : '#ffffff',
      popoverColor: isDark ? '#151515' : '#ffffff',
      borderColor: isDark ? '#252525' : '#dfe5ec',
      dividerColor: isDark ? '#252525' : '#dfe5ec',
    },
    Button: {
      heightSmall: '32px',
      heightMedium: '36px',
      paddingSmall: '0 10px',
      paddingMedium: '0 12px',
      borderRadiusSmall: '7px',
      borderRadiusMedium: '8px',
    },
    Input: {
      heightSmall: '32px',
      heightMedium: '36px',
      borderRadius: '8px',
    },
    Drawer: {
      color: isDark ? '#0c0c0c' : '#ffffff',
    },
  }
}
```

- [ ] **Step 4: Create AppProviders**

Create `frontend/src/components/AppProviders.vue`:

```vue
<script setup lang="ts">
import { darkTheme, NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { computed } from 'vue'
import { createNaiveThemeOverrides } from '../lib/naiveTheme'
import type { ThemeMode } from '../lib/theme'

const props = defineProps<{
  theme: ThemeMode
}>()

const naiveTheme = computed(() => (props.theme === 'dark' ? darkTheme : null))
const themeOverrides = computed(() => createNaiveThemeOverrides(props.theme))
</script>

<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NMessageProvider>
        <slot />
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>
```

- [ ] **Step 5: Commit dependency and provider infrastructure**

Run:

```powershell
npm --prefix frontend test -- src/lib/naiveTheme.test.ts
```

Expected: PASS.

Commit:

```powershell
git add frontend/package.json frontend/package-lock.json frontend/src/lib/naiveTheme.ts frontend/src/lib/naiveTheme.test.ts frontend/src/components/AppProviders.vue
git commit -m "Add Naive UI theme infrastructure"
```

## Task 2: Add App Feedback And Prompt Dialog

**Files:**
- Create: `frontend/src/lib/appFeedback.ts`
- Create: `frontend/src/components/PromptDialog.vue`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/App.test.ts`

- [ ] **Step 1: Write failing App feedback tests**

In `frontend/src/App.test.ts`, replace the Element Plus import and mock block with a mock for `./lib/appFeedback`.

Add this hoisted mock near the current mock declarations:

```ts
const appFeedbackMocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  prompt: vi.fn(),
  error: vi.fn(),
}))
```

Add this module mock:

```ts
vi.mock('./lib/appFeedback', () => ({
  createAppFeedback: () => appFeedbackMocks,
}))
```

Update `beforeEach`:

```ts
appFeedbackMocks.confirm.mockResolvedValue(undefined)
appFeedbackMocks.prompt.mockResolvedValue('未命名.md')
```

Change references:

```ts
expect(appFeedbackMocks.confirm).not.toHaveBeenCalled()
expect(appFeedbackMocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
  title: '关闭未保存笔记',
  content: '「intro.md」有未保存更改，关闭后将丢失。',
  positiveText: '关闭',
  negativeText: '取消',
  type: 'warning',
}))
expect(appFeedbackMocks.prompt).toHaveBeenCalledWith(expect.objectContaining({
  title: '新建笔记',
  initialValue: '未命名.md',
  positiveText: '创建',
  negativeText: '取消',
}))
expect(appFeedbackMocks.error).toHaveBeenCalledWith('无法读取笔记')
```

Run:

```powershell
npm --prefix frontend test -- src/App.test.ts -t "uses Element Plus confirmation"
```

Expected: FAIL because `frontend/src/lib/appFeedback.ts` does not exist and `App.vue` still imports Element Plus.

- [ ] **Step 2: Create feedback utility**

Create `frontend/src/lib/appFeedback.ts`:

```ts
import { createDiscreteApi, darkTheme } from 'naive-ui'
import { computed, type Ref } from 'vue'
import { createNaiveThemeOverrides } from './naiveTheme'
import type { ThemeMode } from './theme'

export type ConfirmType = 'default' | 'warning' | 'error'

export type ConfirmOptions = {
  title: string
  content: string
  positiveText: string
  negativeText: string
  type?: ConfirmType
}

export type PromptOptions = {
  title: string
  initialValue: string
  positiveText: string
  negativeText: string
}

export type PromptHandler = (options: PromptOptions) => Promise<string | null>

export type AppFeedback = {
  confirm(options: ConfirmOptions): Promise<void>
  prompt(options: PromptOptions): Promise<string | null>
  error(message: string): void
}

export function createAppFeedback(theme: Ref<ThemeMode>, prompt: PromptHandler): AppFeedback {
  const { message, dialog } = createDiscreteApi(['message', 'dialog'], {
    configProviderProps: computed(() => ({
      theme: theme.value === 'dark' ? darkTheme : null,
      themeOverrides: createNaiveThemeOverrides(theme.value),
    })),
  })

  return {
    confirm(options) {
      return new Promise<void>((resolve, reject) => {
        const createDialog = options.type === 'error' ? dialog.error : dialog.warning
        createDialog({
          title: options.title,
          content: options.content,
          positiveText: options.positiveText,
          negativeText: options.negativeText,
          onPositiveClick: () => {
            resolve()
          },
          onNegativeClick: () => {
            reject(new Error('cancelled'))
          },
          onClose: () => {
            reject(new Error('cancelled'))
          },
        })
      })
    },
    prompt,
    error(messageText) {
      message.error(messageText)
    },
  }
}
```

- [ ] **Step 3: Create PromptDialog**

Create `frontend/src/components/PromptDialog.vue`:

```vue
<script setup lang="ts">
import { NButton, NInput, NModal } from 'naive-ui'
import { nextTick, ref } from 'vue'
import type { PromptOptions } from '../lib/appFeedback'

const open = ref(false)
const value = ref('')
const options = ref<PromptOptions>({
  title: '',
  initialValue: '',
  positiveText: '确定',
  negativeText: '取消',
})
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
let resolver: ((value: string | null) => void) | null = null

async function requestPrompt(nextOptions: PromptOptions): Promise<string | null> {
  options.value = nextOptions
  value.value = nextOptions.initialValue
  open.value = true
  await nextTick()
  inputRef.value?.focus()
  return new Promise((resolve) => {
    resolver = resolve
  })
}

function resolvePrompt(result: string | null) {
  open.value = false
  resolver?.(result)
  resolver = null
}

function confirmPrompt() {
  resolvePrompt(value.value)
}

function cancelPrompt() {
  resolvePrompt(null)
}

defineExpose({ requestPrompt })
</script>

<template>
  <NModal
    v-model:show="open"
    preset="dialog"
    :title="options.title"
    :show-icon="false"
    class="prompt-dialog"
    @after-leave="resolver && cancelPrompt()"
  >
    <NInput
      ref="inputRef"
      v-model:value="value"
      data-test="prompt-input"
      @keydown.enter.prevent="confirmPrompt"
    />
    <template #action>
      <NButton data-test="prompt-cancel" @click="cancelPrompt">
        {{ options.negativeText }}
      </NButton>
      <NButton type="primary" data-test="prompt-confirm" @click="confirmPrompt">
        {{ options.positiveText }}
      </NButton>
    </template>
  </NModal>
</template>
```

- [ ] **Step 4: Wire providers and feedback in App**

In `frontend/src/App.vue`, remove:

```ts
import { ElMessage, ElMessageBox } from 'element-plus'
```

Add:

```ts
import AppProviders from './components/AppProviders.vue'
import PromptDialog from './components/PromptDialog.vue'
import { createAppFeedback } from './lib/appFeedback'
```

Add refs after `const searchPanel`:

```ts
const promptDialog = ref<InstanceType<typeof PromptDialog> | null>(null)
const feedback = createAppFeedback(theme, (options) =>
  promptDialog.value?.requestPrompt(options) ?? Promise.resolve(null),
)
```

Replace prompt calls:

```ts
const result = await feedback.prompt({
  title: '新建笔记',
  initialValue: '未命名.md',
  positiveText: '创建',
  negativeText: '取消',
})
name = result?.trim() ?? ''
```

Use the same pattern for folder creation and rename:

```ts
const result = await feedback.prompt({
  title: '新建子目录',
  initialValue: '新建文件夹',
  positiveText: '创建',
  negativeText: '取消',
})
```

```ts
const result = await feedback.prompt({
  title: '重命名',
  initialValue: node.name,
  positiveText: '重命名',
  negativeText: '取消',
})
```

Replace confirm calls:

```ts
await feedback.confirm({
  title: '删除项目',
  content: `删除「${node.name}」？此操作无法撤销。`,
  positiveText: '删除',
  negativeText: '取消',
  type: 'warning',
})
```

Use equivalent `feedback.confirm` calls for workspace switch, dirty tab close, and attachment-directory prompt.

Replace `ElMessage.error(message)` with:

```ts
feedback.error(message)
```

Wrap the template contents:

```vue
<template>
  <AppProviders :theme="theme">
    <div
      class="app-shell"
      :class="{ 'without-sidebar': !showSidebar, 'is-resizing-sidebar': isResizingSidebar }"
      :style="layoutFontStyle"
    >
      <!-- existing app shell content -->
    </div>
    <PromptDialog ref="promptDialog" />
  </AppProviders>
</template>
```

- [ ] **Step 5: Run App tests**

Run:

```powershell
npm --prefix frontend test -- src/App.test.ts
```

Expected: PASS for feedback-related tests after all `ElMessageBox` and `ElMessage` assertions are updated.

- [ ] **Step 6: Commit App feedback migration**

Run:

```powershell
git add frontend/src/App.vue frontend/src/App.test.ts frontend/src/lib/appFeedback.ts frontend/src/components/PromptDialog.vue
git commit -m "Migrate app feedback to Naive UI"
```

## Task 3: Migrate Command And Format Toolbars

**Files:**
- Modify: `frontend/src/components/CommandToolbar.vue`
- Modify: `frontend/src/components/CommandToolbar.test.ts`
- Modify: `frontend/src/components/FormatToolbar.vue`
- Modify: `frontend/src/components/FormatToolbar.test.ts`

- [ ] **Step 1: Write failing toolbar tests**

Update `frontend/src/components/CommandToolbar.test.ts`:

```ts
expect(wrapper.get('[data-test="utility-search"]').classes()).toContain('n-button')
expect(wrapper.get('[data-test="save-now"]').attributes('disabled')).toBeDefined()
expect(wrapper.get('[data-test="utility-outline"]').attributes('aria-pressed')).toBe('true')
```

Run:

```powershell
npm --prefix frontend test -- src/components/CommandToolbar.test.ts
```

Expected: FAIL because the toolbar still renders Element Plus buttons.

- [ ] **Step 2: Migrate CommandToolbar**

Replace `frontend/src/components/CommandToolbar.vue` with:

```vue
<script setup lang="ts">
import { ListTree, Moon, Save, Search, Settings, Sun } from '@lucide/vue'
import { NButton, NTooltip } from 'naive-ui'
import type { ThemeMode } from '../lib/theme'
import type { SaveState, UtilityPanel } from '../types/app'

const props = defineProps<{
  activePanel: UtilityPanel
  drawerOpen: boolean
  searchOpen: boolean
  theme: ThemeMode
  saveState: SaveState
}>()

const emit = defineEmits<{
  (event: 'select', panel: UtilityPanel): void
  (event: 'search'): void
  (event: 'save'): void
  (event: 'toggle-theme'): void
}>()

function panelActive(panel: UtilityPanel) {
  return props.drawerOpen && props.activePanel === panel
}
</script>

<template>
  <header data-test="command-toolbar" class="command-toolbar">
    <div class="command-toolbar__spacer" aria-hidden="true" />
    <div class="command-actions">
      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            data-test="utility-search"
            class="command-button"
            :class="{ active: searchOpen }"
            :aria-pressed="searchOpen"
            aria-label="搜索"
            title="搜索"
            size="small"
            quaternary
            @click="emit('search')"
          >
            <Search :size="15" />
          </NButton>
        </template>
        搜索
      </NTooltip>

      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            data-test="save-now"
            class="command-button"
            aria-label="立即保存"
            title="立即保存"
            size="small"
            quaternary
            :loading="saveState === 'saving'"
            :disabled="saveState === 'saving'"
            @click="emit('save')"
          >
            <Save :size="15" />
          </NButton>
        </template>
        立即保存
      </NTooltip>

      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            data-test="utility-outline"
            class="command-button"
            :class="{ active: panelActive('outline') }"
            :aria-pressed="panelActive('outline')"
            aria-label="大纲"
            title="大纲"
            size="small"
            quaternary
            @click="emit('select', 'outline')"
          >
            <ListTree :size="15" />
          </NButton>
        </template>
        大纲
      </NTooltip>

      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            data-test="utility-settings"
            class="command-button"
            :class="{ active: panelActive('settings') }"
            :aria-pressed="panelActive('settings')"
            aria-label="设置"
            title="设置"
            size="small"
            quaternary
            @click="emit('select', 'settings')"
          >
            <Settings :size="15" />
          </NButton>
        </template>
        设置
      </NTooltip>

      <NTooltip trigger="hover" placement="bottom">
        <template #trigger>
          <NButton
            data-test="theme-toggle"
            class="command-button"
            :aria-label="theme === 'dark' ? '切换浅色' : '切换深色'"
            :title="theme === 'dark' ? '切换浅色' : '切换深色'"
            size="small"
            quaternary
            @click="emit('toggle-theme')"
          >
            <Sun v-if="theme === 'dark'" :size="15" />
            <Moon v-else :size="15" />
          </NButton>
        </template>
        {{ theme === 'dark' ? '切换浅色' : '切换深色' }}
      </NTooltip>
    </div>
  </header>
</template>
```

- [ ] **Step 3: Migrate FormatToolbar**

Replace Element Plus imports in `frontend/src/components/FormatToolbar.vue` with:

```ts
import { NButton, NTooltip } from 'naive-ui'
```

Use this template:

```vue
<template>
  <div
    data-test="format-toolbar"
    class="toolbar-group control-cluster format-toolbar format-toolbar--vertical"
    role="toolbar"
    aria-label="格式工具"
  >
    <NTooltip
      v-for="action in formatActions"
      :key="action.key"
      trigger="hover"
      :placement="tooltipPlacement"
    >
      <template #trigger>
        <NButton
          class="tool-button"
          :data-test="`format-${action.key}`"
          :aria-label="action.title"
          :title="action.title"
          size="small"
          quaternary
          @click="$emit('insert-markdown', action.markdown)"
        >
          <component :is="action.icon" :size="17" />
        </NButton>
      </template>
      {{ action.title }}
    </NTooltip>
  </div>
</template>
```

- [ ] **Step 4: Run toolbar tests**

Run:

```powershell
npm --prefix frontend test -- src/components/CommandToolbar.test.ts src/components/FormatToolbar.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit toolbar migration**

Run:

```powershell
git add frontend/src/components/CommandToolbar.vue frontend/src/components/CommandToolbar.test.ts frontend/src/components/FormatToolbar.vue frontend/src/components/FormatToolbar.test.ts
git commit -m "Migrate toolbar controls to Naive UI"
```

## Task 4: Replace DocumentTabs With A Custom Tab Strip

**Files:**
- Modify: `frontend/src/components/DocumentTabs.vue`
- Modify: `frontend/src/components/DocumentTabs.test.ts`

- [ ] **Step 1: Write failing custom-tab test**

Replace the second test in `frontend/src/components/DocumentTabs.test.ts` with:

```ts
test('emits switch events when tab buttons are clicked', async () => {
  const wrapper = mount(DocumentTabs, {
    props: {
      documents,
      activePath: 'intro.md',
    },
  })

  await wrapper.get('[data-test="tab-draft.md"]').trigger('click')

  expect(wrapper.emitted('update:activePath')?.[0]).toEqual(['draft.md'])
})
```

Add active accessibility assertions to the first test:

```ts
expect(wrapper.get('[data-test="tab-draft.md"]').attributes('aria-selected')).toBe('true')
expect(wrapper.get('[data-test="tab-intro.md"]').attributes('aria-selected')).toBe('false')
```

Run:

```powershell
npm --prefix frontend test -- src/components/DocumentTabs.test.ts
```

Expected: FAIL because `DocumentTabs` still depends on `ElTabs`.

- [ ] **Step 2: Replace DocumentTabs implementation**

Replace `frontend/src/components/DocumentTabs.vue` with:

```vue
<script setup lang="ts">
import { FileText, X } from '@lucide/vue'
import { isDocumentDirty } from '../lib/markdownDirty'
import type { OpenDocument } from '../types/app'

const props = defineProps<{
  documents: OpenDocument[]
  activePath: string
}>()

const emit = defineEmits<{
  (event: 'update:activePath', path: string): void
  (event: 'close', document: OpenDocument): void
}>()
</script>

<template>
  <div v-if="documents.length" class="document-tabs" role="tablist" aria-label="打开的笔记">
    <button
      v-for="document in props.documents"
      :key="document.path"
      class="document-tab"
      :class="{ active: document.path === activePath }"
      :data-test="`tab-${document.path}`"
      type="button"
      role="tab"
      :aria-selected="document.path === activePath"
      :title="document.path"
      @click="emit('update:activePath', document.path)"
    >
      <span class="document-tab-label">
        <FileText :size="14" aria-hidden="true" />
        <span>{{ document.name }}</span>
        <span v-if="isDocumentDirty(document)" class="dirty-mark" aria-label="未保存">*</span>
      </span>
      <button
        class="tab-close-button"
        :data-test="`tab-close-${document.path}`"
        type="button"
        :title="`关闭 ${document.name}`"
        :aria-label="`关闭 ${document.name}`"
        @click.stop="emit('close', document)"
      >
        <X :size="13" aria-hidden="true" />
      </button>
    </button>
  </div>
</template>
```

- [ ] **Step 3: Run tab tests**

Run:

```powershell
npm --prefix frontend test -- src/components/DocumentTabs.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit custom document tabs**

Run:

```powershell
git add frontend/src/components/DocumentTabs.vue frontend/src/components/DocumentTabs.test.ts
git commit -m "Replace document tabs with custom tab strip"
```

## Task 5: Replace WorkspaceSidebar Tree With A Custom Recursive Tree

**Files:**
- Modify: `frontend/src/components/WorkspaceSidebar.vue`
- Create: `frontend/src/components/WorkspaceTreeNode.vue`
- Modify: `frontend/src/components/WorkspaceSidebar.test.ts`

- [ ] **Step 1: Write failing workspace tree tests**

Remove the `ElTree` import from `frontend/src/components/WorkspaceSidebar.test.ts`.

Replace folder click tests with direct event assertions:

```ts
test('clicking an expanded folder emits exactly one collapse intent', async () => {
  const wrapper = mount(WorkspaceSidebar, {
    props: {
      workspaceName: 'notes',
      tree,
      activeFilePath: '',
      expandedFolderPaths: ['projects', 'projects/archive'],
    },
  })

  await wrapper.get('[data-test="folder-projects"]').trigger('click')

  expect(wrapper.emitted('folder-collapsed')).toEqual([['projects']])
  expect(wrapper.emitted('folder-expanded')).toBeUndefined()
})
```

Add the expand test:

```ts
test('clicking a collapsed folder emits exactly one expand intent', async () => {
  const wrapper = mount(WorkspaceSidebar, {
    props: {
      workspaceName: 'notes',
      tree,
      activeFilePath: '',
      expandedFolderPaths: [],
    },
  })

  await wrapper.get('[data-test="folder-projects"]').trigger('click')

  expect(wrapper.emitted('folder-expanded')).toEqual([['projects']])
  expect(wrapper.emitted('folder-collapsed')).toBeUndefined()
})
```

Replace the filter test with DOM filtering:

```ts
test('filters tree nodes from the sidebar search', async () => {
  const wrapper = mount(WorkspaceSidebar, {
    props: {
      workspaceName: 'notes',
      tree,
      activeFilePath: '',
      expandedFolderPaths: ['projects', 'projects/archive'],
    },
  })

  await wrapper.get('[data-test="file-tree-search"] input').setValue('plan')

  expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(true)
  expect(wrapper.find('[data-test="folder-projects"]').exists()).toBe(true)

  await wrapper.get('[data-test="file-tree-search"] input').setValue('missing')

  expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(false)
})
```

Run:

```powershell
npm --prefix frontend test -- src/components/WorkspaceSidebar.test.ts
```

Expected: FAIL because the current implementation still uses Element Plus tree mechanics.

- [ ] **Step 2: Create WorkspaceTreeNode component**

Create `frontend/src/components/WorkspaceTreeNode.vue`:

```vue
<script setup lang="ts">
import {
  ChevronDown,
  ChevronRight,
  FilePenLine,
  FolderClosed,
  FolderOpen,
  NotebookTabs,
} from '@lucide/vue'
import type { main } from '../../wailsjs/go/models'

const workspaceRootPath = '__donote_workspace_root__'

const props = defineProps<{
  node: main.FileNode
  depth: number
  activeFilePath: string
  expandedPaths: Set<string>
}>()

const emit = defineEmits<{
  (event: 'select-file', path: string): void
  (event: 'toggle-folder', path: string, expanded: boolean): void
  (event: 'open-context-menu', event: MouseEvent, node: main.FileNode): void
}>()

function isExpanded(node: main.FileNode) {
  return props.expandedPaths.has(node.path)
}

function isWorkspaceRoot(node: main.FileNode) {
  return node.path === workspaceRootPath
}

function treeNodeTestId(node: main.FileNode) {
  if (isWorkspaceRoot(node)) return 'workspace-root'
  return node.type === 'file' ? `file-${node.path}` : `folder-${node.path}`
}

function treeNodeTitle(node: main.FileNode) {
  return isWorkspaceRoot(node) ? node.name : node.path
}

function treeNodeAriaLabel(node: main.FileNode, expanded: boolean) {
  if (node.type === 'file') return `打开文件 ${node.name}`
  const nodeKind = isWorkspaceRoot(node) ? '工作区' : '文件夹'
  return `${expanded ? '折叠' : '展开'}${nodeKind} ${node.name}`
}

function handleClick() {
  if (props.node.type === 'file') {
    emit('select-file', props.node.path)
    return
  }
  emit('toggle-folder', props.node.path, !isExpanded(props.node))
}
</script>

<template>
  <li class="file-tree-item">
    <button
      class="tree-row file-tree-node"
      :class="{
        folder: node.type === 'folder',
        'workspace-root': isWorkspaceRoot(node),
        active: node.path === activeFilePath,
      }"
      :aria-current="node.path === activeFilePath ? 'page' : undefined"
      :aria-expanded="node.type === 'folder' ? isExpanded(node) : undefined"
      :aria-label="treeNodeAriaLabel(node, isExpanded(node))"
      :data-test="treeNodeTestId(node)"
      :style="{ '--tree-depth': depth }"
      :title="treeNodeTitle(node)"
      type="button"
      @click.stop="handleClick"
      @contextmenu.prevent.stop="emit('open-context-menu', $event, node)"
    >
      <span
        class="file-tree-node__chevron"
        :class="{ 'file-tree-node__chevron--spacer': node.type !== 'folder' }"
        aria-hidden="true"
      >
        <ChevronRight v-if="node.type === 'folder' && !isExpanded(node)" :size="14" />
        <ChevronDown v-else-if="node.type === 'folder'" :size="14" />
      </span>
      <span
        class="file-tree-node__icon"
        :class="{
          'file-tree-node__icon--workspace': isWorkspaceRoot(node),
          'file-tree-node__icon--folder': node.type === 'folder' && !isWorkspaceRoot(node),
          'file-tree-node__icon--file': node.type === 'file',
        }"
        aria-hidden="true"
      >
        <NotebookTabs v-if="isWorkspaceRoot(node)" :size="15" />
        <FolderOpen v-else-if="node.type === 'folder' && isExpanded(node)" :size="15" />
        <FolderClosed v-else-if="node.type === 'folder'" :size="15" />
        <FilePenLine v-else :size="15" />
      </span>
      <span class="file-tree-node__label">
        <span class="file-tree-node__name">{{ node.name }}</span>
      </span>
    </button>

    <ul v-if="node.type === 'folder' && isExpanded(node)" class="file-tree-children">
      <WorkspaceTreeNode
        v-for="child in node.children ?? []"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :active-file-path="activeFilePath"
        :expanded-paths="expandedPaths"
        @select-file="emit('select-file', $event)"
        @toggle-folder="(path, expanded) => emit('toggle-folder', path, expanded)"
        @open-context-menu="(event, contextNode) => emit('open-context-menu', event, contextNode)"
      />
    </ul>
  </li>
</template>
```

- [ ] **Step 3: Replace WorkspaceSidebar Element Plus usage**

In `frontend/src/components/WorkspaceSidebar.vue`, remove Element Plus imports and add:

```ts
import { Search } from '@lucide/vue'
import { NEmpty, NInput } from 'naive-ui'
import WorkspaceTreeNode from './WorkspaceTreeNode.vue'
```

Replace `treeRef`, `treeProps`, and `expandedTreeKeys` with:

```ts
const visibleTree = computed(() => filterTree(displayTree.value, fileTreeQuery.value))
const expandedPathSet = computed(() => {
  const keys = new Set(props.expandedFolderPaths)
  if (props.workspaceName && !workspaceRootCollapsed.value) {
    keys.add(workspaceRootPath)
  }
  return keys
})
```

Add filtering:

```ts
function filterTree(nodes: main.FileNode[], query: string): main.FileNode[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return nodes

  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], query)
    const matches =
      node.name.toLocaleLowerCase().includes(normalizedQuery) ||
      node.path.toLocaleLowerCase().includes(normalizedQuery)
    if (matches || children.length > 0) {
      return [
        main.FileNode.createFrom({
          ...node,
          children,
        }),
      ]
    }
    return []
  })
}
```

Replace folder click logic with:

```ts
function toggleFolder(path: string, expanded: boolean) {
  const node = findNodeByPath(path, displayTree.value)
  if (!node || node.type !== 'folder') return
  handleFolderExpansionChange(node, expanded)
}

function findNodeByPath(path: string, nodes: main.FileNode[]): main.FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node
    const child = findNodeByPath(path, node.children ?? [])
    if (child) return child
  }
  return null
}
```

Replace the tree template with:

```vue
<div v-if="workspaceName || tree.length" data-test="file-tree-search" class="file-tree-search">
  <NInput v-model:value="fileTreeQuery" placeholder="搜索文件" clearable aria-label="搜索文件">
    <template #prefix>
      <Search :size="15" />
    </template>
  </NInput>
</div>
<NEmpty v-else class="sidebar-empty" description="还没有打开笔记文件夹" :show-icon="false" />

<div v-if="visibleTree.length" class="file-tree-scroll">
  <ul class="file-tree">
    <WorkspaceTreeNode
      v-for="node in visibleTree"
      :key="node.path"
      :node="node"
      :depth="0"
      :active-file-path="activeFilePath"
      :expanded-paths="expandedPathSet"
      @select-file="$emit('select-file', $event)"
      @toggle-folder="toggleFolder"
      @open-context-menu="openContextMenu"
    />
  </ul>
</div>
```

- [ ] **Step 4: Run sidebar tests**

Run:

```powershell
npm --prefix frontend test -- src/components/WorkspaceSidebar.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit custom workspace tree**

Run:

```powershell
git add frontend/src/components/WorkspaceSidebar.vue frontend/src/components/WorkspaceTreeNode.vue frontend/src/components/WorkspaceSidebar.test.ts
git commit -m "Replace workspace tree with custom renderer"
```

## Task 6: Migrate Search, Drawer, Outline, Settings, And Empty States

**Files:**
- Modify: `frontend/src/components/SearchPanel.vue`
- Modify: `frontend/src/components/SearchPanel.test.ts`
- Modify: `frontend/src/components/UtilityDrawer.vue`
- Modify: `frontend/src/components/SettingsPanel.vue`
- Modify: `frontend/src/components/OutlinePanel.vue`
- Modify: `frontend/src/components/EditorSurface.vue`
- Modify: `frontend/src/components/EditorSurface.test.ts`

- [ ] **Step 1: Write failing SearchPanel disabled-state test**

Add to `frontend/src/components/SearchPanel.test.ts`:

```ts
test('disables match navigation when there are no results', () => {
  const wrapper = mount(SearchPanel, {
    props: {
      query: 'missing',
      result: {
        query: 'missing',
        matches: [],
      },
      activeIndex: -1,
    },
  })

  expect(wrapper.get('[data-test="search-previous"]').attributes('disabled')).toBeDefined()
  expect(wrapper.get('[data-test="search-next"]').attributes('disabled')).toBeDefined()
})
```

Run:

```powershell
npm --prefix frontend test -- src/components/SearchPanel.test.ts
```

Expected: FAIL because current previous/next buttons are still enabled.

- [ ] **Step 2: Migrate SearchPanel**

Replace Element Plus imports in `frontend/src/components/SearchPanel.vue` with:

```ts
import { NButton, NInput } from 'naive-ui'
```

Use Naive components:

```vue
<NInput
  :value="query"
  data-test="search-input"
  placeholder="在当前笔记中搜索"
  clearable
  @update:value="$emit('update:query', String($event))"
>
  <template #prefix>
    <Search :size="16" />
  </template>
</NInput>
```

Use disabled navigation:

```vue
<NButton data-test="search-previous" :disabled="result.matches.length === 0" @click="$emit('previous')">
  上一个
</NButton>
<NButton data-test="search-next" :disabled="result.matches.length === 0" @click="$emit('next')">
  下一个
</NButton>
```

Use close button:

```vue
<NButton
  class="search-close-button"
  data-test="search-close"
  aria-label="关闭搜索"
  title="关闭搜索"
  quaternary
  circle
  @click="$emit('close')"
>
  <X :size="16" />
</NButton>
```

- [ ] **Step 3: Migrate UtilityDrawer**

In `frontend/src/components/UtilityDrawer.vue`, replace `ElDrawer` with:

```vue
<template>
  <NDrawer
    :show="modelValue"
    class="utility-drawer"
    :width="320"
    placement="right"
    @update:show="$emit('update:modelValue', $event)"
  >
    <NDrawerContent :title="titles[activePanel]" closable>
      <OutlinePanel
        v-if="activePanel === 'outline'"
        :items="props.outline"
        :font-size="props.outlineFontSize"
      />
      <SettingsPanel
        v-else
        :model-value="layoutFontSizes"
        :workspace-root="workspaceRoot"
        :editor-width="editorWidth"
        :attachment-directories="attachmentDirectories"
        @update-font-size="emitFontSize"
        @update-editor-width="emitEditorWidth"
        @update-attachment-directory="emitAttachmentDirectory"
        @select-attachment-directory="emitSelectAttachmentDirectory"
        @select-workspace="emitSelectWorkspace"
      />
    </NDrawerContent>
  </NDrawer>
</template>
```

Import:

```ts
import { NDrawer, NDrawerContent } from 'naive-ui'
```

- [ ] **Step 4: Migrate SettingsPanel**

Replace Element Plus imports in `frontend/src/components/SettingsPanel.vue` with:

```ts
import { NButton, NForm, NFormItem, NInput, NInputNumber, NSlider } from 'naive-ui'
```

Use this pattern for slider controls:

```vue
<NFormItem :label="editorWidthControl.label">
  <div class="settings-slider-row" :data-test="'editor-width'">
    <NSlider
      :value="editorWidth"
      :min="editorWidthControl.min"
      :max="editorWidthControl.max"
      :step="editorWidthControl.step"
      @update:value="$emit('update-editor-width', Number($event))"
    />
    <NInputNumber
      :value="editorWidth"
      :min="editorWidthControl.min"
      :max="editorWidthControl.max"
      :step="editorWidthControl.step"
      size="small"
      @update:value="$emit('update-editor-width', Number($event))"
    />
  </div>
</NFormItem>
```

Use this pattern for attachment paths:

```vue
<NInput
  data-test="attachment-image-dir"
  :value="attachmentDirectories.images"
  placeholder="例如 assets/images"
  @update:value="$emit('update-attachment-directory', 'images', String($event))"
>
  <template #suffix>
    <NButton size="small" data-test="select-attachment-image-dir" @click="$emit('select-attachment-directory', 'images')">
      选择
    </NButton>
  </template>
</NInput>
```

- [ ] **Step 5: Migrate OutlinePanel and EditorSurface empty states**

In `frontend/src/components/OutlinePanel.vue`, import:

```ts
import { NEmpty, NScrollbar } from 'naive-ui'
```

Use:

```vue
<NScrollbar class="utility-panel-scroll">
  <div class="utility-panel outline-panel-content" :style="{ '--outline-font-size': `${fontSize}px` }">
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
    <NEmpty v-else description="当前笔记没有标题" :show-icon="false" />
  </div>
</NScrollbar>
```

In `frontend/src/components/EditorSurface.vue`, replace `ElEmpty` with:

```vue
<NEmpty v-else class="empty-state" description="选择一个笔记文件夹开始写作" :show-icon="false" />
```

- [ ] **Step 6: Run affected component tests**

Run:

```powershell
npm --prefix frontend test -- src/components/SearchPanel.test.ts src/components/EditorSurface.test.ts src/App.test.ts
```

Expected: PASS after App tests are updated for Naive input wrappers where required.

- [ ] **Step 7: Commit panel and drawer migration**

Run:

```powershell
git add frontend/src/components/SearchPanel.vue frontend/src/components/SearchPanel.test.ts frontend/src/components/UtilityDrawer.vue frontend/src/components/SettingsPanel.vue frontend/src/components/OutlinePanel.vue frontend/src/components/EditorSurface.vue frontend/src/components/EditorSurface.test.ts frontend/src/App.test.ts
git commit -m "Migrate panels and drawer to Naive UI"
```

## Task 7: Rewrite CSS For Donote Native Classes

**Files:**
- Modify: `frontend/src/style.css`
- Modify: `frontend/src/style.test.ts`

- [ ] **Step 1: Replace Element Plus style tests**

In `frontend/src/style.test.ts`, remove tests that assert `.el-button`, `.el-drawer`, `.el-tree`, `.el-tabs`, `.el-input`, and `--el-` selectors.

Add:

```ts
test('styles Naive-backed command buttons through Donote classes', () => {
  const buttonBlock = cssBlock('.command-button')
  const activeBlock = cssBlock('.command-button.active')

  expect(buttonBlock).toMatch(/width:\s*32px/)
  expect(buttonBlock).toMatch(/height:\s*32px/)
  expect(activeBlock).toMatch(/background:\s*var\(--accent-soft\)/)
  expect(activeBlock).toMatch(/color:\s*var\(--accent-strong\)/)
})
```

Add:

```ts
test('styles custom document tabs without Element Plus selectors', () => {
  expect(cssBlock('.document-tabs')).toMatch(/display:\s*flex/)
  expect(cssBlock('.document-tab')).toMatch(/max-width:\s*190px/)
  expect(cssBlock('.document-tab.active')).toMatch(/color:\s*var\(--accent-strong\)/)
  expect(stylesheet).not.toContain('.document-tabs.el-tabs')
})
```

Run:

```powershell
npm --prefix frontend test -- src/style.test.ts
```

Expected: FAIL until CSS is rewritten.

- [ ] **Step 2: Remove Element Plus CSS blocks**

In `frontend/src/style.css`, remove all selectors containing:

```css
.el-button
.el-input
.el-textarea
.el-drawer
.el-tabs
.el-tree
.el-empty
.el-scrollbar
--el-
```

Keep base variables, shell layout, sidebar, tree row, tab label, editor, search, drawer, and settings classes.

- [ ] **Step 3: Add Donote component styles**

Add these styles:

```css
.command-button {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 7px;
  color: var(--text-muted);
}

.command-button.active,
.command-button:hover,
.command-button:focus-visible {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.document-tabs {
  display: flex;
  align-items: end;
  min-width: 0;
  min-height: 34px;
  gap: 4px;
  padding: 5px 28px 0;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
  font-size: var(--tabs-font-size, 13px);
}

.document-tab {
  display: inline-flex;
  align-items: center;
  max-width: 190px;
  height: 29px;
  min-width: 0;
  gap: 6px;
  padding: 0 8px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border), transparent 22%);
  border-bottom: 0;
  border-radius: 7px 7px 0 0;
  background: color-mix(in srgb, var(--surface-muted), var(--app-bg) 18%);
  color: var(--text-subtle);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.document-tab.active {
  border-color: color-mix(in srgb, var(--accent), var(--border) 36%);
  background: var(--surface);
  color: var(--accent-strong);
  box-shadow: inset 0 2px 0 var(--accent);
}

.settings-slider-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px;
  align-items: center;
  gap: 10px;
}
```

Update `.file-tree-scroll` and `.utility-panel-scroll` to native scroll:

```css
.file-tree-scroll,
.utility-panel-scroll {
  min-height: 0;
  height: 100%;
  overflow: auto;
}
```

- [ ] **Step 4: Run style tests**

Run:

```powershell
npm --prefix frontend test -- src/style.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit CSS rewrite**

Run:

```powershell
git add frontend/src/style.css frontend/src/style.test.ts
git commit -m "Rewrite shell styles for Naive UI"
```

## Task 8: Remove Element Plus Dependency And Sweep Imports

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/main.ts`
- Modify: all frontend files found by search

- [ ] **Step 1: Uninstall Element Plus and remove global CSS imports**

Run:

```powershell
npm --prefix frontend uninstall element-plus
```

Expected: `frontend/package.json` no longer lists `element-plus`.

Remove these imports from `frontend/src/main.ts`:

```ts
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
```

- [ ] **Step 2: Verify no Element Plus imports remain**

Run:

```powershell
rg -n "element-plus|El[A-Z]|\\.el-|--el-" frontend/src frontend/package.json
```

Expected: no output.

- [ ] **Step 3: Fix any remaining imports**

If the search prints a file, remove the Element Plus import and replace the usage with the target already defined in earlier tasks:

```ts
import { NButton, NInput, NTooltip } from 'naive-ui'
```

Then re-run:

```powershell
rg -n "element-plus|El[A-Z]|\\.el-|--el-" frontend/src frontend/package.json
```

Expected: no output.

- [ ] **Step 4: Run focused frontend tests**

Run:

```powershell
npm --prefix frontend test -- src/components/CommandToolbar.test.ts src/components/WorkspaceSidebar.test.ts src/components/DocumentTabs.test.ts src/components/SearchPanel.test.ts src/App.test.ts src/style.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit dependency removal**

Run:

```powershell
git add frontend/package.json frontend/package-lock.json frontend/src
git commit -m "Remove Element Plus dependency"
```

## Task 9: Full Verification And Visual QA

**Files:**
- Modify only if verification finds a defect in already-touched frontend files.

- [ ] **Step 1: Run all frontend tests**

Run:

```powershell
npm --prefix frontend test
```

Expected: all Vitest suites pass.

- [ ] **Step 2: Run frontend build**

Run:

```powershell
npm --prefix frontend run build
```

Expected: `vue-tsc --noEmit && vite build` completes successfully.

- [ ] **Step 3: Run backend tests if no frontend-only guarantee remains obvious**

Run:

```powershell
go test ./...
```

Expected: all Go tests pass.

- [ ] **Step 4: Start the dev server for visual review**

Run:

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 5: Manual visual checklist**

Open the local Vite URL and verify:

```text
1. Empty state shows "选择一个笔记文件夹开始写作".
2. Command toolbar buttons are compact, aligned, labelled, and focus-visible.
3. Workspace sidebar search filters nested files.
4. Folder expand/collapse works from mouse and keyboard focus.
5. File and folder context menus appear at pointer coordinates.
6. Multiple tabs switch and close without layout jumps.
7. Dirty tabs show the dirty marker.
8. Editor search opens, focuses, navigates matches, and closes.
9. Outline drawer and settings drawer are readable.
10. Prompt dialogs appear for create and rename.
11. Confirm dialogs appear for delete, dirty close, dirty workspace switch, and attachment configuration.
12. Theme toggle switches between readable light and dark modes.
```

- [ ] **Step 6: Commit verification fixes if needed**

If verification required code changes, commit them:

```powershell
git add frontend/src frontend/package.json frontend/package-lock.json
git commit -m "Polish Naive UI migration"
```

If no changes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: dependency replacement, providers, feedback APIs, custom workspace tree, custom document tabs, panels, drawer, settings, empty states, CSS token cleanup, accessibility, and verification are covered by Tasks 1 through 9.
- Placeholder scan: this plan contains concrete file paths, commands, code snippets, and expected results. It does not rely on unspecified future work.
- Type consistency: `ThemeMode`, `UtilityPanel`, `OpenDocument`, `PromptOptions`, `ConfirmOptions`, and event names match the current codebase or are introduced in this plan before use.
