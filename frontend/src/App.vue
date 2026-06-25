<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  CreateFolder,
  CreateMarkdown,
  DeletePath,
  ListWorkspace,
  LoadSettings,
  OpenWorkspace,
  ReadMarkdown,
  RenamePath,
  ResolveImageSource,
  SaveAttachment,
  SaveMarkdown,
  SaveSettings,
  SelectAttachmentDirectory,
  SelectWorkspace,
} from '../wailsjs/go/main/App'
import type { main } from '../wailsjs/go/models'
import { EventsOn } from '../wailsjs/runtime/runtime'
import AppProviders from './components/AppProviders.vue'
import DocumentTabs from './components/DocumentTabs.vue'
import EditorSurface from './components/EditorSurface.vue'
import PromptDialog from './components/PromptDialog.vue'
import SearchPanel from './components/SearchPanel.vue'
import CommandToolbar from './components/CommandToolbar.vue'
import UtilityDrawer from './components/UtilityDrawer.vue'
import WorkspaceSidebar from './components/WorkspaceSidebar.vue'
import { createAppFeedback } from './lib/appFeedback'
import { createAppSettingsStorage } from './lib/appSettingsStorage'
import {
  attachmentDirectoriesStorageKey,
  getInitialAttachmentDirectories,
  saveAttachmentDirectories,
  type AttachmentDirectories,
} from './lib/attachmentDirectories'
import {
  editorWidthStorageKey,
  getInitialEditorWidth,
  normalizeEditorWidth,
  saveEditorWidth,
} from './lib/editorWidth'
import {
  getInitialLayoutFontSizes,
  layoutFontSizeStorageKey,
  saveLayoutFontSizes,
  type LayoutFontSizeArea,
} from './lib/layoutFontSizes'
import { isDocumentDirty } from './lib/markdownDirty'
import {
  clearOpenDocumentSession,
  getInitialOpenDocumentSession,
  openDocumentSessionStorageKey,
  saveOpenDocumentSession,
} from './lib/openDocumentSession'
import { extractOutline } from './lib/outline'
import { findMatches, nextMatchIndex, previousMatchIndex } from './lib/search'
import {
  getInitialSidebarWidth,
  normalizeSidebarWidth,
  saveSidebarWidth,
  sidebarWidthStorageKey,
} from './lib/sidebarWidth'
import {
  applyTheme,
  getInitialTheme,
  themeStorageKey,
  toggleTheme,
  type ThemeMode,
} from './lib/theme'
import {
  getInitialCollapsedFolderPaths,
  saveCollapsedFolderPaths,
  treeExpansionStorageKey,
} from './lib/treeExpansion'
import type { OpenDocument, SaveState, UtilityPanel } from './types/app'

const lastWorkspaceStorageKey = 'donote.lastWorkspaceRoot'
const settingsStorageKeys = [
  themeStorageKey,
  lastWorkspaceStorageKey,
  layoutFontSizeStorageKey,
  editorWidthStorageKey,
  attachmentDirectoriesStorageKey,
  openDocumentSessionStorageKey,
  sidebarWidthStorageKey,
  treeExpansionStorageKey,
]

let settingsReady = false
const settingsStorage = createAppSettingsStorage(undefined, () => {
  if (settingsReady) {
    persistSettings()
  }
})

const workspace = ref<main.WorkspaceInfo | null>(null)
const openDocuments = ref<OpenDocument[]>([])
const activeDocumentPath = ref('')
const loading = ref(false)
const errorMessage = ref('')
const dismissedErrorKey = ref('')
const showSidebar = ref(true)
const activeUtilityPanel = ref<UtilityPanel>('outline')
const showUtilityDrawer = ref(false)
const searchQuery = ref('')
const activeSearchIndex = ref(-1)
const theme = ref<ThemeMode>(getInitialTheme(settingsStorage))
const loadingDocument = ref(false)
const layoutFontSizes = ref(getInitialLayoutFontSizes(settingsStorage))
const editorWidth = ref(getInitialEditorWidth(settingsStorage))
const attachmentDirectories = ref(getInitialAttachmentDirectories(settingsStorage))
const sidebarWidth = ref(getInitialSidebarWidth(settingsStorage))
const isResizingSidebar = ref(false)
const collapsedFolderPaths = ref<Set<string>>(new Set())
const menuEventCleanups: Array<() => void> = []
const showEditorSearch = ref(false)
const searchPanel = ref<{ focus: () => void } | null>(null)
const promptDialog = ref<InstanceType<typeof PromptDialog> | null>(null)
const feedback = createAppFeedback(theme, (options) =>
  promptDialog.value?.requestPrompt(options) ?? Promise.resolve(null),
)

let sidebarResizeStartX = 0
let sidebarResizeStartWidth = sidebarWidth.value
let workspaceSelectionPromise: Promise<main.WorkspaceInfo | null> | null = null

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
const currentErrorMessage = computed(() => errorMessage.value || activeDocument.value?.error || '')
const currentErrorKey = computed(() => {
  if (errorMessage.value) {
    return `global:${errorMessage.value}`
  }
  if (activeDocument.value?.error) {
    return `document:${activeDocument.value.path}:${activeDocument.value.error}`
  }
  return ''
})
const visibleErrorMessage = computed(() =>
  currentErrorKey.value !== dismissedErrorKey.value ? currentErrorMessage.value : '',
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
const activeFilePath = computed(() => activeDocument.value?.path ?? '')
const layoutFontStyle = computed(() => ({
  '--sidebar-width': `${sidebarWidth.value}px`,
  '--sidebar-font-size': `${layoutFontSizes.value.sidebar}px`,
  '--tabs-font-size': `${layoutFontSizes.value.tabs}px`,
  '--editor-font-size': `${layoutFontSizes.value.editor}px`,
  '--outline-font-size': `${layoutFontSizes.value.outline}px`,
  '--editor-content-width': `${editorWidth.value}px`,
}))

watch(searchQuery, () => {
  activeSearchIndex.value = searchResult.value.matches.length > 0 ? 0 : -1
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  menuEventCleanups.push(
    EventsOn('menu:open-workspace', () => {
      void openWorkspace()
    }),
    EventsOn('menu:create-note', () => {
      void createNote()
    }),
  )
  void initializeApp()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  removeSidebarResizeListeners()
  while (menuEventCleanups.length) {
    menuEventCleanups.pop()?.()
  }
})

onUnmounted(() => {
  feedback.destroy()
})

async function initializeApp() {
  await initializeSettings()
  await initializeWorkspace()
}

async function initializeSettings() {
  try {
    settingsStorage.replace(await LoadSettings())
  } catch (error) {
    setError(error)
  }

  migrateLegacyLocalStorageSettings()
  applyStoredSettings()
  settingsReady = true
  persistSettings()
}

function applyStoredSettings() {
  theme.value = getInitialTheme(settingsStorage)
  layoutFontSizes.value = getInitialLayoutFontSizes(settingsStorage)
  editorWidth.value = getInitialEditorWidth(settingsStorage)
  attachmentDirectories.value = getInitialAttachmentDirectories(settingsStorage)
  sidebarWidth.value = getInitialSidebarWidth(settingsStorage)
  applyTheme(theme.value, settingsStorage)
}

function persistSettings() {
  void SaveSettings(settingsStorage.snapshot()).catch(setError)
}

function migrateLegacyLocalStorageSettings() {
  for (const key of settingsStorageKeys) {
    if (settingsStorage.getItem(key) !== null) {
      continue
    }
    const legacyValue = window.localStorage.getItem(key)
    if (legacyValue !== null) {
      settingsStorage.setItem(key, legacyValue)
    }
  }
}

async function initializeWorkspace() {
  const restored = await restoreLastWorkspace()
  if (!restored && !workspace.value) {
    await openWorkspace()
  }
}

function openWorkspace(): Promise<main.WorkspaceInfo | null> {
  if (!workspaceSelectionPromise) {
    workspaceSelectionPromise = runOpenWorkspace().finally(() => {
      workspaceSelectionPromise = null
    })
  }
  return workspaceSelectionPromise
}

async function runOpenWorkspace(): Promise<main.WorkspaceInfo | null> {
  errorMessage.value = ''
  loading.value = true
  try {
    return await selectAndApplyWorkspace()
  } catch (error) {
    setError(error)
    return null
  } finally {
    loading.value = false
  }
}

async function selectAndApplyWorkspace(): Promise<main.WorkspaceInfo | null> {
  const selected = await SelectWorkspace()
  if (!selected?.rootPath) {
    return null
  }
  applyWorkspaceInfo(selected)
  persistOpenDocumentSession()
  settingsStorage.setItem(lastWorkspaceStorageKey, selected.rootPath)
  return selected
}

async function restoreLastWorkspace(): Promise<boolean> {
  const lastWorkspaceRoot = settingsStorage.getItem(lastWorkspaceStorageKey)
  if (workspace.value) {
    return true
  }
  if (!lastWorkspaceRoot) {
    return false
  }

  loading.value = true
  try {
    const restored = await OpenWorkspace(lastWorkspaceRoot)
    applyWorkspaceInfo(restored)
    await restoreOpenDocumentsForWorkspace(restored.rootPath)
    return true
  } catch {
    settingsStorage.removeItem(lastWorkspaceStorageKey)
    return false
  } finally {
    loading.value = false
  }
}

function applyWorkspaceInfo(info: main.WorkspaceInfo) {
  collapsedFolderPaths.value = new Set(
    getInitialCollapsedFolderPaths(info.rootPath, collectFolderPaths(info.tree), settingsStorage),
  )
  workspace.value = info
  openDocuments.value = []
  activeDocumentPath.value = ''
  searchQuery.value = ''
  activeSearchIndex.value = -1
}

async function restoreOpenDocumentsForWorkspace(rootPath: string) {
  const session = getInitialOpenDocumentSession(settingsStorage)
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
  await createMarkdownInTree('')
}

async function createMarkdownInTree(parentPath: string) {
  if (!workspace.value) return
  let name = ''
  const result = await feedback.prompt({
    title: '新建笔记',
    initialValue: '未命名.md',
    positiveText: '创建',
    negativeText: '取消',
  })
  name = result?.trim() ?? ''
  if (!name) return

  try {
    const node = await CreateMarkdown(parentPath, name)
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
    if (parentPath) {
      setFolderCollapsed(parentPath, false)
    }
    await selectFile(node.path)
  } catch (error) {
    setError(error)
  }
}

async function createFolderInTree(parentPath: string) {
  if (!workspace.value) return
  let name = ''
  const result = await feedback.prompt({
    title: '新建子目录',
    initialValue: '新建文件夹',
    positiveText: '创建',
    negativeText: '取消',
  })
  name = result?.trim() ?? ''
  if (!name) return

  try {
    await CreateFolder(parentPath, name)
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
    if (parentPath) {
      setFolderCollapsed(parentPath, false)
    }
  } catch (error) {
    setError(error)
  }
}

async function renameTreeNode(path: string) {
  if (!workspace.value) return
  const node = findTreeNode(path)
  if (!node) return

  let name = ''
  const result = await feedback.prompt({
    title: '重命名',
    initialValue: node.name,
    positiveText: '重命名',
    negativeText: '取消',
  })
  name = result?.trim() ?? ''
  if (!name) return

  try {
    const renamed = await RenamePath(path, name)
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
    updateCollapsedFolderPathsAfterRename(path, renamed.path)
    updateOpenDocumentsAfterRename(path, renamed)
  } catch (error) {
    setError(error)
  }
}

async function deleteTreeNode(path: string) {
  if (!workspace.value) return
  const node = findTreeNode(path)
  if (!node) return

  try {
    await feedback.confirm({
      title: '删除项目',
      content: `删除「${node.name}」？此操作无法撤销。`,
      positiveText: '删除',
      negativeText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await DeletePath(path)
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
    updateCollapsedFolderPathsAfterDelete(path)
    updateOpenDocumentsAfterDelete(path)
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

async function handlePasteFiles(files: File[]) {
  const document = activeDocument.value
  if (!workspace.value || !document || files.length === 0) {
    return
  }

  const missingDirectories = getMissingAttachmentDirectories(files)
  if (missingDirectories.length > 0) {
    await promptConfigureAttachmentDirectories(missingDirectories)
    return
  }

  try {
    const markdown = await Promise.all(
      files.map(async (file) => {
        const directory = isImageFile(file)
          ? attachmentDirectories.value.images
          : attachmentDirectories.value.files
        const base64 = await readFileAsBase64(file)
        const attachment = await SaveAttachment(directory, file.name, file.type, base64)
        return attachmentMarkdown(file, attachment, document.path)
      }),
    )
    insertMarkdown(markdown.join('\n'))
    workspace.value.tree = await reloadTreeFromCurrentWorkspace()
  } catch (error) {
    setError(error)
  }
}

function insertMarkdown(markdown: string) {
  if (!activeDocument.value) return
  const spacer = editorContent.value && !editorContent.value.endsWith('\n') ? '\n\n' : ''
  editorContent.value = `${editorContent.value}${spacer}${markdown}`
}

function syncActiveCleanContent(content: string) {
  const document = activeDocument.value
  if (!document || loadingDocument.value || isDocumentDirty(document)) {
    return
  }
  document.content = content
  document.savedContent = content
  document.error = ''
}

async function resolveEditorImageSource(source: string, documentPath: string) {
  return ResolveImageSource(documentPath, source)
}

function handleKeydown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if ((event.ctrlKey || event.metaKey) && key === 's') {
    event.preventDefault()
    void flushSave()
  }
  if ((event.ctrlKey || event.metaKey) && key === 'f') {
    event.preventDefault()
    void openEditorSearch()
  }
  if (key === 'escape' && showEditorSearch.value) {
    event.preventDefault()
    closeEditorSearch()
  }
}

async function openEditorSearch() {
  showEditorSearch.value = true
  await nextTick()
  searchPanel.value?.focus()
}

function closeEditorSearch() {
  showEditorSearch.value = false
  searchQuery.value = ''
  activeSearchIndex.value = -1
}

function toggleEditorSearch() {
  if (showEditorSearch.value) {
    closeEditorSearch()
    return
  }
  void openEditorSearch()
}

function switchTheme() {
  theme.value = toggleTheme(theme.value, settingsStorage)
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
  sidebarWidth.value = saveSidebarWidth(sidebarWidth.value, settingsStorage)
  removeSidebarResizeListeners()
}

function removeSidebarResizeListeners() {
  window.removeEventListener('pointermove', resizeSidebar)
  window.removeEventListener('pointerup', finishSidebarResize)
  window.removeEventListener('pointercancel', finishSidebarResize)
}

function openUtilityPanel(panel: UtilityPanel) {
  activeUtilityPanel.value = panel
  showUtilityDrawer.value = true
}

function toggleUtilityPanel(panel: UtilityPanel) {
  if (activeUtilityPanel.value === panel) {
    showUtilityDrawer.value = !showUtilityDrawer.value
    return
  }
  openUtilityPanel(panel)
}

function setLayoutFontSize(area: LayoutFontSizeArea, value: number) {
  layoutFontSizes.value = saveLayoutFontSizes({
    ...layoutFontSizes.value,
    [area]: value,
  }, settingsStorage)
}

function setEditorWidth(value: number) {
  editorWidth.value = saveEditorWidth(normalizeEditorWidth(value), settingsStorage)
}

function setAttachmentDirectory(key: keyof AttachmentDirectories, value: string) {
  attachmentDirectories.value = saveAttachmentDirectories({
    ...attachmentDirectories.value,
    [key]: value,
  }, settingsStorage)
}

async function selectAttachmentDirectory(key: keyof AttachmentDirectories) {
  try {
    const selected = await SelectAttachmentDirectory(key)
    if (!selected) {
      return
    }
    setAttachmentDirectory(key, selected)
  } catch (error) {
    setError(error)
  }
}

async function selectWorkspaceFromSettings() {
  if (!(await confirmWorkspaceSwitchIfDirty())) {
    return
  }
  await openWorkspace()
}

async function confirmWorkspaceSwitchIfDirty(): Promise<boolean> {
  if (!hasDirtyDocuments()) {
    return true
  }

  try {
    await feedback.confirm({
      title: '切换工作目录',
      content: '当前工作区有未保存更改，切换后将丢失。',
      positiveText: '切换',
      negativeText: '取消',
      type: 'warning',
    })
    return true
  } catch {
    return false
  }
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
      await feedback.confirm({
        title: '关闭未保存笔记',
        content: `「${document.name}」有未保存更改，关闭后将丢失。`,
        positiveText: '关闭',
        negativeText: '取消',
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

function hasDirtyDocuments(): boolean {
  return openDocuments.value.some(isDocumentDirty)
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
    clearOpenDocumentSession(settingsStorage)
    return
  }

  saveOpenDocumentSession({
    rootPath: workspace.value.rootPath,
    paths: openDocuments.value.map((document) => document.path),
    activePath: activeDocumentPath.value,
  }, settingsStorage)
}

function findTreeNode(path: string, nodes = workspace.value?.tree ?? []): main.FileNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node
    }
    const child = findTreeNode(path, node.children ?? [])
    if (child) {
      return child
    }
  }
  return null
}

function updateOpenDocumentsAfterRename(oldPath: string, renamed: main.FileNode) {
  const oldPrefix = `${oldPath}/`
  const newPrefix = `${renamed.path}/`
  openDocuments.value = openDocuments.value.map((document) => {
    if (document.path === oldPath) {
      return { ...document, path: renamed.path, name: renamed.name }
    }
    if (document.path.startsWith(oldPrefix)) {
      return {
        ...document,
        path: `${newPrefix}${document.path.slice(oldPrefix.length)}`,
      }
    }
    return document
  })

  if (activeDocumentPath.value === oldPath) {
    activeDocumentPath.value = renamed.path
  } else if (activeDocumentPath.value.startsWith(oldPrefix)) {
    activeDocumentPath.value = `${newPrefix}${activeDocumentPath.value.slice(oldPrefix.length)}`
  }
  persistOpenDocumentSession()
}

function updateOpenDocumentsAfterDelete(path: string) {
  const deletedIndex = openDocuments.value.findIndex((document) =>
    isPathInsideTreeItem(document.path, path),
  )
  openDocuments.value = openDocuments.value.filter(
    (document) => !isPathInsideTreeItem(document.path, path),
  )

  if (isPathInsideTreeItem(activeDocumentPath.value, path)) {
    activeDocumentPath.value =
      openDocuments.value[deletedIndex]?.path ??
      openDocuments.value[Math.max(0, deletedIndex - 1)]?.path ??
      ''
  }
  persistOpenDocumentSession()
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
  saveCollapsedFolderPaths(workspace.value.rootPath, [...next], settingsStorage)
}

function updateCollapsedFolderPathsAfterRename(oldPath: string, newPath: string) {
  if (!workspace.value) return
  const oldPrefix = `${oldPath}/`
  const newPrefix = `${newPath}/`
  const next = [...collapsedFolderPaths.value].map((path) => {
    if (path === oldPath) return newPath
    if (path.startsWith(oldPrefix)) {
      return `${newPrefix}${path.slice(oldPrefix.length)}`
    }
    return path
  })
  collapsedFolderPaths.value = new Set(next)
  saveCollapsedFolderPaths(workspace.value.rootPath, next, settingsStorage)
}

function updateCollapsedFolderPathsAfterDelete(path: string) {
  if (!workspace.value) return
  const next = [...collapsedFolderPaths.value].filter(
    (collapsedPath) => !isPathInsideTreeItem(collapsedPath, path),
  )
  collapsedFolderPaths.value = new Set(next)
  saveCollapsedFolderPaths(workspace.value.rootPath, next, settingsStorage)
}

function isCollapsedOrInsideCollapsedFolder(path: string, collapsedPaths: Set<string>) {
  for (const collapsedPath of collapsedPaths) {
    if (path === collapsedPath || path.startsWith(`${collapsedPath}/`)) {
      return true
    }
  }
  return false
}

function isPathInsideTreeItem(path: string, treeItemPath: string) {
  return path === treeItemPath || path.startsWith(`${treeItemPath}/`)
}

function getMissingAttachmentDirectories(files: File[]) {
  const missing: string[] = []
  if (files.some(isImageFile) && !attachmentDirectories.value.images) {
    missing.push('图片存储目录')
  }
  if (files.some((file) => !isImageFile(file)) && !attachmentDirectories.value.files) {
    missing.push('文件存储目录')
  }
  return missing
}

async function promptConfigureAttachmentDirectories(missingDirectories: string[]) {
  try {
    await feedback.confirm({
      title: '未配置附件目录',
      content: `粘贴图片或文件前，请先在设置中配置${missingDirectories.join('和')}。`,
      positiveText: '去设置',
      negativeText: '取消',
      type: 'warning',
    })
    openUtilityPanel('settings')
  } catch {
    // User dismissed the configuration prompt.
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('读取粘贴文件失败'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

function attachmentMarkdown(file: File, attachment: main.Attachment, documentPath: string) {
  const label = escapeMarkdownLabel(attachment.name)
  const target = encodeURI(relativeLinkTarget(documentPath, attachment.path))
  return isImageFile(file) ? `![${label}](${target})` : `[${label}](${target})`
}

function relativeLinkTarget(documentPath: string, attachmentPath: string) {
  const documentParts = documentPath.split('/').slice(0, -1)
  const attachmentParts = attachmentPath.split('/')
  let shared = 0
  while (
    shared < documentParts.length &&
    shared < attachmentParts.length &&
    documentParts[shared] === attachmentParts[shared]
  ) {
    shared += 1
  }

  return [
    ...Array(documentParts.length - shared).fill('..'),
    ...attachmentParts.slice(shared),
  ].join('/')
}

function escapeMarkdownLabel(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]')
}

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

function setError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  errorMessage.value = message
  dismissedErrorKey.value = ''
  feedback.error(message)
}

function dismissErrorBanner() {
  dismissedErrorKey.value = currentErrorKey.value
}
</script>

<template>
  <AppProviders :theme="theme">
    <div
      class="app-shell"
      :class="{ 'without-sidebar': !showSidebar, 'is-resizing-sidebar': isResizingSidebar }"
      :style="layoutFontStyle"
    >
    <div v-if="visibleErrorMessage" data-test="error-banner" class="error-banner" role="alert">
      <span class="error-banner__message">{{ visibleErrorMessage }}</span>
      <button
        data-test="dismiss-error-banner"
        class="error-banner__close"
        type="button"
        aria-label="关闭错误提示"
        title="关闭错误提示"
        @click="dismissErrorBanner"
      >
        <X :size="14" />
      </button>
    </div>

    <CommandToolbar
      :active-panel="activeUtilityPanel"
      :drawer-open="showUtilityDrawer"
      :theme="theme"
      :save-state="activeSaveState"
      :search-open="showEditorSearch"
      @select="toggleUtilityPanel"
      @search="toggleEditorSearch"
      @save="flushSave"
      @toggle-theme="switchTheme"
    />

    <div
      data-test="workspace-layout"
      class="workspace-layout"
      :class="{ 'without-sidebar': !showSidebar, 'is-resizing-sidebar': isResizingSidebar }"
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
        @create-folder="createFolderInTree"
        @create-markdown="createMarkdownInTree"
        @rename-node="renameTreeNode"
        @delete-node="deleteTreeNode"
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

        <SearchPanel
          v-if="showEditorSearch"
          ref="searchPanel"
          class="editor-search-panel"
          :query="searchQuery"
          :result="searchResult"
          :active-index="activeSearchIndex"
          @update:query="searchQuery = $event"
          @previous="goToPreviousMatch"
          @next="goToNextMatch"
          @close="closeEditorSearch"
        />

        <EditorSurface
          v-model="editorContent"
          :document="activeDocument"
          :search-query="searchQuery"
          :active-search-index="activeSearchIndex"
          :resolve-image-source="resolveEditorImageSource"
          @sync-clean-content="syncActiveCleanContent"
          @paste-files="handlePasteFiles"
          @insert-markdown="insertMarkdown"
        />
      </main>

      <UtilityDrawer
        v-model="showUtilityDrawer"
        :active-panel="activeUtilityPanel"
        :outline="outline"
        :outline-font-size="layoutFontSizes.outline"
        :workspace-root="workspace?.rootPath ?? ''"
        :layout-font-sizes="layoutFontSizes"
        :editor-width="editorWidth"
        :attachment-directories="attachmentDirectories"
        @update-font-size="setLayoutFontSize"
        @update-editor-width="setEditorWidth"
        @update-attachment-directory="setAttachmentDirectory"
        @select-attachment-directory="selectAttachmentDirectory"
        @select-workspace="selectWorkspaceFromSettings"
      />
    </div>
    </div>
    <PromptDialog ref="promptDialog" />
  </AppProviders>
</template>
