<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CreateMarkdown,
  ListWorkspace,
  OpenWorkspace,
  ReadMarkdown,
  SaveMarkdown,
  SelectWorkspace,
} from '../wailsjs/go/main/App'
import type { main } from '../wailsjs/go/models'
import { EventsOn } from '../wailsjs/runtime/runtime'
import AppHeader from './components/AppHeader.vue'
import DocumentTabs from './components/DocumentTabs.vue'
import EditorSurface from './components/EditorSurface.vue'
import UtilityDrawer from './components/UtilityDrawer.vue'
import UtilityRail from './components/UtilityRail.vue'
import WorkspaceSidebar from './components/WorkspaceSidebar.vue'
import {
  getInitialEditorWidth,
  normalizeEditorWidth,
  saveEditorWidth,
} from './lib/editorWidth'
import {
  getInitialLayoutFontSizes,
  normalizeLayoutFontSizes,
  saveLayoutFontSizes,
  type LayoutFontSizeArea,
  type LayoutFontSizes,
} from './lib/layoutFontSizes'
import {
  clearOpenDocumentSession,
  getInitialOpenDocumentSession,
  saveOpenDocumentSession,
} from './lib/openDocumentSession'
import { extractOutline } from './lib/outline'
import { findMatches, nextMatchIndex, previousMatchIndex } from './lib/search'
import {
  getInitialSidebarWidth,
  normalizeSidebarWidth,
  saveSidebarWidth,
} from './lib/sidebarWidth'
import { applyTheme, getInitialTheme, toggleTheme, type ThemeMode } from './lib/theme'
import { getCollapsedFolderPaths, saveCollapsedFolderPaths } from './lib/treeExpansion'
import type { OpenDocument, SaveState, UtilityPanel } from './types/app'

const lastWorkspaceStorageKey = 'donote.lastWorkspaceRoot'

const workspace = ref<main.WorkspaceInfo | null>(null)
const openDocuments = ref<OpenDocument[]>([])
const activeDocumentPath = ref('')
const loading = ref(false)
const errorMessage = ref('')
const showSidebar = ref(true)
const activeUtilityPanel = ref<UtilityPanel>('outline')
const showUtilityDrawer = ref(false)
const searchQuery = ref('')
const activeSearchIndex = ref(-1)
const theme = ref<ThemeMode>(getInitialTheme())
const loadingDocument = ref(false)
const layoutFontSizes = ref(getInitialLayoutFontSizes())
const draftLayoutFontSizes = ref<LayoutFontSizes>({ ...layoutFontSizes.value })
const editorWidth = ref(getInitialEditorWidth())
const draftEditorWidth = ref(editorWidth.value)
const sidebarWidth = ref(getInitialSidebarWidth())
const isResizingSidebar = ref(false)
const collapsedFolderPaths = ref<Set<string>>(new Set())
const menuEventCleanups: Array<() => void> = []

let sidebarResizeStartX = 0
let sidebarResizeStartWidth = sidebarWidth.value

const expandedFolderPaths = computed(() =>
  workspace.value
    ? collectFolderPaths(workspace.value.tree).filter(
        (path) => !isCollapsedOrInsideCollapsedFolder(path, collapsedFolderPaths.value),
      )
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
  '--sidebar-width': `${sidebarWidth.value}px`,
  '--sidebar-font-size': `${layoutFontSizes.value.sidebar}px`,
  '--editor-font-size': `${layoutFontSizes.value.editor}px`,
  '--outline-font-size': `${layoutFontSizes.value.outline}px`,
  '--editor-content-width': `${editorWidth.value}px`,
}))

watch(searchQuery, () => {
  activeSearchIndex.value = searchResult.value.matches.length > 0 ? 0 : -1
})

onMounted(() => {
  applyTheme(theme.value)
  window.addEventListener('keydown', handleKeydown)
  menuEventCleanups.push(
    EventsOn('menu:open-workspace', () => {
      void openWorkspace()
    }),
    EventsOn('menu:create-note', () => {
      void createNote()
    }),
  )
  void restoreLastWorkspace()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  removeSidebarResizeListeners()
  while (menuEventCleanups.length) {
    menuEventCleanups.pop()?.()
  }
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
    persistOpenDocumentSession()
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
    await restoreOpenDocumentsForWorkspace(restored.rootPath)
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

async function restoreOpenDocumentsForWorkspace(rootPath: string) {
  const session = getInitialOpenDocumentSession()
  if (!session || session.rootPath !== rootPath) {
    return
  }

  loadingDocument.value = true
  const restoredDocuments: OpenDocument[] = []
  for (const path of session.paths) {
    try {
      const document = await ReadMarkdown(path)
      restoredDocuments.push(createOpenDocument(document))
    } catch {
      // Skip files that were moved or deleted since the previous session.
    }
  }
  openDocuments.value = restoredDocuments
  activeDocumentPath.value =
    restoredDocuments.find((document) => document.path === session.activePath)?.path ??
    restoredDocuments[0]?.path ??
    ''
  loadingDocument.value = false
  persistOpenDocumentSession()
  await nextTick()
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
    persistOpenDocumentSession()
    return
  }
  try {
    loadingDocument.value = true
    const document = await ReadMarkdown(path)
    openDocuments.value.push(createOpenDocument(document))
    activeDocumentPath.value = document.path
    searchQuery.value = ''
    activeSearchIndex.value = -1
    persistOpenDocumentSession()
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
  let name = ''
  try {
    const result = await ElMessageBox.prompt('请输入笔记名称', '新建笔记', {
      inputValue: '未命名.md',
      confirmButtonText: '创建',
      cancelButtonText: '取消',
    })
    name = result.value.trim()
  } catch {
    return
  }
  if (!name) return

  try {
    const node = await CreateMarkdown('', name)
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
    await selectFile(node.path)
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
    openUtilityPanel('search')
  }
}

function switchTheme() {
  theme.value = toggleTheme(theme.value)
}

function startSidebarResize(event: PointerEvent) {
  if (event.button !== 0 || isResizingSidebar.value) {
    return
  }
  event.preventDefault()
  sidebarResizeStartX = event.clientX
  sidebarResizeStartWidth = sidebarWidth.value
  isResizingSidebar.value = true
  window.addEventListener('pointermove', resizeSidebar)
  window.addEventListener('pointerup', finishSidebarResize)
  window.addEventListener('pointercancel', finishSidebarResize)
}

function resizeSidebar(event: PointerEvent) {
  if (!isResizingSidebar.value) {
    return
  }
  sidebarWidth.value = normalizeSidebarWidth(
    sidebarResizeStartWidth + event.clientX - sidebarResizeStartX,
  )
}

function finishSidebarResize() {
  if (!isResizingSidebar.value) {
    return
  }
  isResizingSidebar.value = false
  sidebarWidth.value = saveSidebarWidth(sidebarWidth.value)
  removeSidebarResizeListeners()
}

function removeSidebarResizeListeners() {
  window.removeEventListener('pointermove', resizeSidebar)
  window.removeEventListener('pointerup', finishSidebarResize)
  window.removeEventListener('pointercancel', finishSidebarResize)
}

function prepareUtilityPanel(panel: UtilityPanel) {
  if (panel === 'settings') {
    draftLayoutFontSizes.value = { ...layoutFontSizes.value }
    draftEditorWidth.value = editorWidth.value
  }
}

function openUtilityPanel(panel: UtilityPanel) {
  activeUtilityPanel.value = panel
  prepareUtilityPanel(panel)
  showUtilityDrawer.value = true
}

function toggleUtilityPanel(panel: UtilityPanel) {
  if (activeUtilityPanel.value === panel) {
    const shouldOpen = !showUtilityDrawer.value
    if (shouldOpen) {
      prepareUtilityPanel(panel)
    }
    showUtilityDrawer.value = shouldOpen
    return
  }
  openUtilityPanel(panel)
}

function closeSettings() {
  draftLayoutFontSizes.value = { ...layoutFontSizes.value }
  draftEditorWidth.value = editorWidth.value
  showUtilityDrawer.value = false
}

function setDraftLayoutFontSize(area: LayoutFontSizeArea, value: number) {
  draftLayoutFontSizes.value = normalizeLayoutFontSizes({
    ...draftLayoutFontSizes.value,
    [area]: value,
  })
}

function setDraftEditorWidth(value: number) {
  draftEditorWidth.value = normalizeEditorWidth(value)
}

function saveSettings() {
  layoutFontSizes.value = saveLayoutFontSizes(draftLayoutFontSizes.value)
  draftLayoutFontSizes.value = { ...layoutFontSizes.value }
  editorWidth.value = saveEditorWidth(draftEditorWidth.value)
  draftEditorWidth.value = editorWidth.value
  showUtilityDrawer.value = false
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
  persistOpenDocumentSession()
}

async function closeDocument(document: OpenDocument) {
  if (isDocumentDirty(document)) {
    try {
      await ElMessageBox.confirm(`「${document.name}」有未保存更改，关闭后将丢失。`, '关闭未保存笔记', {
        confirmButtonText: '关闭',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return
    }
  }

  const closedIndex = openDocuments.value.findIndex((item) => item.path === document.path)
  openDocuments.value = openDocuments.value.filter((item) => item.path !== document.path)

  if (activeDocumentPath.value !== document.path) {
    persistOpenDocumentSession()
    return
  }

  activeDocumentPath.value =
    openDocuments.value[closedIndex]?.path ??
    openDocuments.value[Math.max(0, closedIndex - 1)]?.path ??
    ''
  persistOpenDocumentSession()
}

function isDocumentDirty(document: OpenDocument): boolean {
  return normalizeMarkdownForDirtyCheck(document.content) !== normalizeMarkdownForDirtyCheck(document.savedContent)
}

function normalizeMarkdownForDirtyCheck(content: string): string {
  return content.replace(/\s+$/g, '')
}

function createOpenDocument(document: main.Document): OpenDocument {
  return {
    path: document.path,
    name: document.name,
    content: document.content,
    savedContent: document.content,
    saving: false,
    error: '',
  }
}

function persistOpenDocumentSession() {
  if (!workspace.value) {
    clearOpenDocumentSession()
    return
  }

  saveOpenDocumentSession({
    rootPath: workspace.value.rootPath,
    paths: openDocuments.value.map((document) => document.path),
    activePath: activeDocumentPath.value,
  })
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

function isCollapsedOrInsideCollapsedFolder(path: string, collapsedPaths: Set<string>) {
  for (const collapsedPath of collapsedPaths) {
    if (path === collapsedPath || path.startsWith(`${collapsedPath}/`)) {
      return true
    }
  }
  return false
}

function setError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  errorMessage.value = message
  ElMessage.error(message)
}
</script>

<template>
  <div class="app-shell">
    <AppHeader
      :show-sidebar="showSidebar"
      :theme="theme"
      :save-status-text="saveStatusText"
      :save-state="activeSaveState"
      @toggle-sidebar="showSidebar = !showSidebar"
      @insert-markdown="insertMarkdown"
      @search="openUtilityPanel('search')"
      @settings="openUtilityPanel('settings')"
      @save="flushSave"
      @toggle-theme="switchTheme"
    />

    <div v-if="errorMessage || activeDocument?.error" class="error-banner">
      {{ errorMessage || activeDocument?.error }}
    </div>

    <div
      data-test="workspace-layout"
      class="workspace-layout"
      :class="{ 'without-sidebar': !showSidebar, 'is-resizing-sidebar': isResizingSidebar }"
      :style="layoutFontStyle"
    >
      <WorkspaceSidebar
        v-if="showSidebar"
        :workspace-name="workspace?.name ?? ''"
        :tree="workspace?.tree ?? []"
        :active-file-path="activeFilePath"
        :expanded-folder-paths="expandedFolderPaths"
        @select-file="selectFile"
        @folder-expanded="setFolderCollapsed($event, false)"
        @folder-collapsed="setFolderCollapsed($event, true)"
      />
      <button
        v-if="showSidebar"
        data-test="sidebar-resizer"
        class="sidebar-resizer"
        type="button"
        aria-label="调整目录栏宽度"
        @pointerdown="startSidebarResize"
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
        />
      </main>

      <UtilityRail
        :active-panel="activeUtilityPanel"
        :drawer-open="showUtilityDrawer"
        @select="toggleUtilityPanel"
      />
      <UtilityDrawer
        v-model="showUtilityDrawer"
        :active-panel="activeUtilityPanel"
        :outline="outline"
        :outline-font-size="layoutFontSizes.outline"
        v-model:search-query="searchQuery"
        :search-result="searchResult"
        :active-search-index="activeSearchIndex"
        :draft-layout-font-sizes="draftLayoutFontSizes"
        :draft-editor-width="draftEditorWidth"
        @previous-match="goToPreviousMatch"
        @next-match="goToNextMatch"
        @update-font-size="setDraftLayoutFontSize"
        @update-editor-width="setDraftEditorWidth"
        @cancel-settings="closeSettings"
        @save-settings="saveSettings"
      />
    </div>
  </div>
</template>
