<script setup lang="ts">
import {
  ListTree,
  Search,
  Settings,
  X,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CreateMarkdown,
  DeletePath,
  ListWorkspace,
  OpenWorkspace,
  ReadMarkdown,
  RenamePath,
  SaveMarkdown,
  SelectWorkspace,
} from '../wailsjs/go/main/App'
import type { main } from '../wailsjs/go/models'
import AppHeader from './components/AppHeader.vue'
import DocumentTabs from './components/DocumentTabs.vue'
import EditorSurface from './components/EditorSurface.vue'
import WorkspaceSidebar from './components/WorkspaceSidebar.vue'
import {
  getInitialLayoutFontSizes,
  layoutFontSizeControls,
  normalizeLayoutFontSizes,
  saveLayoutFontSizes,
  type LayoutFontSizeArea,
  type LayoutFontSizes,
} from './lib/layoutFontSizes'
import { extractOutline } from './lib/outline'
import { findMatches, nextMatchIndex, previousMatchIndex } from './lib/search'
import { applyTheme, getInitialTheme, toggleTheme, type ThemeMode } from './lib/theme'
import {
  getCollapsedFolderPaths,
  saveCollapsedFolderPaths,
} from './lib/treeExpansion'
import type { OpenDocument, SaveState, UtilityPanel } from './types/app'

const lastWorkspaceStorageKey = 'donote.lastWorkspaceRoot'

const workspace = ref<main.WorkspaceInfo | null>(null)
const openDocuments = ref<OpenDocument[]>([])
const activeDocumentPath = ref('')
const loading = ref(false)
const errorMessage = ref('')
const showSidebar = ref(true)
const showOutline = ref(true)
const showSearch = ref(false)
const showSettings = ref(false)
const activeUtilityPanel = ref<UtilityPanel>('outline')
const showUtilityDrawer = ref(false)
const searchQuery = ref('')
const activeSearchIndex = ref(-1)
const theme = ref<ThemeMode>(getInitialTheme())
const loadingDocument = ref(false)
const layoutFontSizes = ref(getInitialLayoutFontSizes())
const draftLayoutFontSizes = ref<LayoutFontSizes>({ ...layoutFontSizes.value })
const collapsedFolderPaths = ref<Set<string>>(new Set())

const expandedFolderPaths = computed(() =>
  workspace.value
    ? collectFolderPaths(workspace.value.tree).filter((path) => !collapsedFolderPaths.value.has(path))
    : [],
)
const activeDocument = computed(() =>
  openDocuments.value.find((document) => document.path === activeDocumentPath.value) ?? null,
)
const editorContent = computed({
  get: () => activeDocument.value?.content ?? '',
  set: (content: string) => {
    const document = activeDocument.value
    if (!document || loadingDocument.value) {
      return
    }
    document.content = content
    document.error = ''
  },
})
const outline = computed(() => extractOutline(editorContent.value))
const searchResult = computed(() => findMatches(editorContent.value, searchQuery.value))
const activeSaveState = computed<SaveState>(() => {
  if (!activeDocument.value) return 'saved'
  if (activeDocument.value.saving) return 'saving'
  if (activeDocument.value.error) return 'error'
  if (isDocumentDirty(activeDocument.value)) return 'dirty'
  return 'saved'
})
const saveStatusText = computed(() => {
  if (!activeDocument.value) return ''
  if (activeSaveState.value === 'dirty') return '有未保存更改'
  if (activeSaveState.value === 'saving') return '正在保存'
  if (activeSaveState.value === 'error') return '保存失败'
  return '已保存'
})
const activeFilePath = computed(() => activeDocument.value?.path ?? '')
const layoutFontStyle = computed(() => ({
  '--sidebar-font-size': `${layoutFontSizes.value.sidebar}px`,
  '--editor-font-size': `${layoutFontSizes.value.editor}px`,
  '--outline-font-size': `${layoutFontSizes.value.outline}px`,
}))

watch(searchQuery, () => {
  activeSearchIndex.value = searchResult.value.matches.length > 0 ? 0 : -1
})

onMounted(() => {
  applyTheme(theme.value)
  window.addEventListener('keydown', handleKeydown)
  void restoreLastWorkspace()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

async function openWorkspace() {
  errorMessage.value = ''
  loading.value = true
  try {
    const selected = await SelectWorkspace()
    if (!selected.rootPath) {
      return
    }
    applyWorkspaceInfo(selected)
    window.localStorage.setItem(lastWorkspaceStorageKey, selected.rootPath)
  } catch (error) {
    setError(error)
  } finally {
    loading.value = false
  }
}

async function restoreLastWorkspace() {
  const lastWorkspaceRoot = window.localStorage.getItem(lastWorkspaceStorageKey)
  if (!lastWorkspaceRoot || workspace.value) {
    return
  }

  loading.value = true
  try {
    const restored = await OpenWorkspace(lastWorkspaceRoot)
    applyWorkspaceInfo(restored)
  } catch {
    window.localStorage.removeItem(lastWorkspaceStorageKey)
  } finally {
    loading.value = false
  }
}

function applyWorkspaceInfo(info: main.WorkspaceInfo) {
  collapsedFolderPaths.value = new Set(getCollapsedFolderPaths(info.rootPath))
  workspace.value = info
  openDocuments.value = []
  activeDocumentPath.value = ''
  searchQuery.value = ''
  activeSearchIndex.value = -1
}

async function selectFile(path: string) {
  errorMessage.value = ''
  if (activeDocumentPath.value === path) {
    return
  }
  const existing = openDocuments.value.find((document) => document.path === path)
  if (existing) {
    activeDocumentPath.value = existing.path
    searchQuery.value = ''
    activeSearchIndex.value = -1
    return
  }
  try {
    loadingDocument.value = true
    const document = await ReadMarkdown(path)
    openDocuments.value.push({
      path: document.path,
      name: document.name,
      content: document.content,
      savedContent: document.content,
      saving: false,
      error: '',
    })
    activeDocumentPath.value = document.path
    searchQuery.value = ''
    activeSearchIndex.value = -1
    await nextTick()
  } catch (error) {
    setError(error)
  } finally {
    loadingDocument.value = false
  }
}

async function createNote() {
  if (!workspace.value) {
    await openWorkspace()
    if (!workspace.value) return
  }
  const name = window.prompt('新笔记名称', '未命名.md')
  if (!name) return

  try {
    const node = await CreateMarkdown('', name)
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
    await selectFile(node.path)
  } catch (error) {
    setError(error)
  }
}

async function renameActiveDocument() {
  const document = activeDocument.value
  if (!document || !workspace.value) return
  const nextName = window.prompt('重命名笔记', document.name)
  if (!nextName || nextName === document.name) return

  try {
    const renamed = await RenamePath(document.path, nextName)
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
    document.name = renamed.name
    document.path = renamed.path
    activeDocumentPath.value = renamed.path
  } catch (error) {
    setError(error)
  }
}

async function deleteActiveDocument() {
  const document = activeDocument.value
  if (!document || !workspace.value) return
  const confirmed = window.confirm(`删除「${document.name}」？此操作无法撤销。`)
  if (!confirmed) return

  try {
    await DeletePath(document.path)
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
    const deletedIndex = openDocuments.value.findIndex((item) => item.path === document.path)
    openDocuments.value = openDocuments.value.filter((item) => item.path !== document.path)
    activeDocumentPath.value =
      openDocuments.value[Math.max(0, deletedIndex - 1)]?.path ?? openDocuments.value[0]?.path ?? ''
  } catch (error) {
    setError(error)
  }
}

async function reloadTreeFromCurrentWorkspace(): Promise<main.FileNode[]> {
  return ListWorkspace()
}

async function flushSave() {
  const document = activeDocument.value
  if (!document || document.saving) {
    return
  }

  document.saving = true
  document.error = ''
  try {
    await SaveMarkdown(document.path, document.content)
    document.savedContent = document.content
  } catch (error) {
    document.error = error instanceof Error ? error.message : String(error)
    setError(error)
  } finally {
    document.saving = false
  }
}

function insertMarkdown(markdown: string) {
  if (!activeDocument.value) return
  const spacer = editorContent.value && !editorContent.value.endsWith('\n') ? '\n\n' : ''
  editorContent.value = `${editorContent.value}${spacer}${markdown}`
}

function handleKeydown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if ((event.ctrlKey || event.metaKey) && key === 's') {
    event.preventDefault()
    void flushSave()
  }
  if ((event.ctrlKey || event.metaKey) && key === 'f') {
    event.preventDefault()
    showSearch.value = true
  }
}

function switchTheme() {
  theme.value = toggleTheme(theme.value)
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  toggleUtilityPanel('search')
}

function openSettings() {
  draftLayoutFontSizes.value = { ...layoutFontSizes.value }
  showSettings.value = true
}

function openSettingsPanel() {
  openSettings()
  toggleUtilityPanel('settings')
}

function toggleOutline() {
  showOutline.value = !showOutline.value
  toggleUtilityPanel('outline')
}

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

function closeSettings() {
  draftLayoutFontSizes.value = { ...layoutFontSizes.value }
  showSettings.value = false
}

function setDraftLayoutFontSize(area: LayoutFontSizeArea, event: Event) {
  const target = event.target as HTMLInputElement
  draftLayoutFontSizes.value = normalizeLayoutFontSizes({
    ...draftLayoutFontSizes.value,
    [area]: Number(target.value),
  })
}

function saveSettings() {
  layoutFontSizes.value = saveLayoutFontSizes(draftLayoutFontSizes.value)
  draftLayoutFontSizes.value = { ...layoutFontSizes.value }
  showSettings.value = false
}

function goToNextMatch() {
  activeSearchIndex.value = nextMatchIndex(
    activeSearchIndex.value,
    searchResult.value.matches.length,
  )
}

function goToPreviousMatch() {
  activeSearchIndex.value = previousMatchIndex(
    activeSearchIndex.value,
    searchResult.value.matches.length,
  )
}

function switchDocument(path: string) {
  activeDocumentPath.value = path
  searchQuery.value = ''
  activeSearchIndex.value = -1
}

function closeDocument(document: OpenDocument) {
  if (isDocumentDirty(document)) {
    const confirmed = window.confirm(`「${document.name}」有未保存更改，关闭后将丢失。确认关闭？`)
    if (!confirmed) {
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

function isDocumentDirty(document: OpenDocument): boolean {
  return normalizeMarkdownForDirtyCheck(document.content) !== normalizeMarkdownForDirtyCheck(document.savedContent)
}

function normalizeMarkdownForDirtyCheck(content: string): string {
  return content.replace(/\s+$/g, '')
}

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

function setError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : String(error)
}
</script>

<template>
  <div class="app-shell">
    <AppHeader
      :show-sidebar="showSidebar"
      :show-outline="showOutline"
      :theme="theme"
      :save-status-text="saveStatusText"
      :save-state="activeSaveState"
      @toggle-sidebar="showSidebar = !showSidebar"
      @insert-markdown="insertMarkdown"
      @search="toggleSearch"
      @settings="openSettingsPanel"
      @toggle-outline="toggleOutline"
      @save="flushSave"
      @toggle-theme="switchTheme"
      @open-utility="toggleUtilityPanel"
    />

    <div v-if="errorMessage || activeDocument?.error" class="error-banner">
      {{ errorMessage || activeDocument?.error }}
    </div>

    <div v-if="showSearch" class="searchbar floating-search">
      <Search :size="16" />
      <input v-model="searchQuery" class="search-input" placeholder="在当前笔记中搜索" />
      <span class="search-count">{{ searchResult.matches.length ? `${activeSearchIndex + 1}/${searchResult.matches.length}` : '0/0' }}</span>
      <button class="text-button" type="button" @click="goToPreviousMatch">上一个</button>
      <button class="text-button" type="button" @click="goToNextMatch">下一个</button>
    </div>

    <div v-if="showSettings" class="settings-modal-backdrop" @click.self="closeSettings">
      <section
        data-test="settings-dialog"
        class="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header class="settings-dialog-header">
          <div class="settings-heading">
            <Settings :size="17" />
            <div>
              <h2 id="settings-title">设置</h2>
              <p>布局字体大小</p>
            </div>
          </div>
          <button class="icon-button subtle" type="button" title="关闭设置" @click="closeSettings">
            <X :size="18" />
          </button>
        </header>

        <div class="font-size-settings">
          <label v-for="control in layoutFontSizeControls" :key="control.key" class="setting-row">
            <span>{{ control.label }}</span>
            <input
              :data-test="`font-size-${control.key}`"
              type="range"
              :min="control.min"
              :max="control.max"
              :value="draftLayoutFontSizes[control.key]"
              @input="setDraftLayoutFontSize(control.key, $event)"
            />
            <output>{{ draftLayoutFontSizes[control.key] }}px</output>
          </label>
        </div>

        <footer class="settings-actions">
          <button class="text-button" type="button" @click="closeSettings">取消</button>
          <button data-test="settings-save" class="primary-button" type="button" @click="saveSettings">
            保存
          </button>
        </footer>
      </section>
    </div>

    <div
      data-test="workspace-layout"
      class="workspace-layout"
      :class="{ 'without-sidebar': !showSidebar, 'without-outline': !showOutline }"
      :style="layoutFontStyle"
    >
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

      <aside v-if="showOutline" class="outline-panel">
        <div class="panel-title">
          <ListTree :size="16" />
          <span>大纲</span>
        </div>
        <div v-if="outline.length" class="outline-list">
          <button
            v-for="item in outline"
            :key="item.id"
            class="outline-row"
            type="button"
            :style="{ paddingLeft: `${8 + (item.level - 1) * 14}px` }"
          >
            {{ item.text }}
          </button>
        </div>
        <p v-else class="outline-empty">当前笔记没有标题</p>
      </aside>
    </div>
  </div>
</template>
