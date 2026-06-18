<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CreateFolder,
  CreateMarkdown,
  DeletePath,
  ListWorkspace,
  OpenWorkspace,
  ReadMarkdown,
  RenamePath,
  ResolveImageSource,
  SaveAttachment,
  SaveMarkdown,
  SelectAttachmentDirectory,
  SelectWorkspace,
} from '../wailsjs/go/main/App'
import type { main } from '../wailsjs/go/models'
import { EventsOn } from '../wailsjs/runtime/runtime'
import DocumentTabs from './components/DocumentTabs.vue'
import EditorSurface from './components/EditorSurface.vue'
import SearchPanel from './components/SearchPanel.vue'
import UtilityDrawer from './components/UtilityDrawer.vue'
import UtilityRail from './components/UtilityRail.vue'
import WorkspaceSidebar from './components/WorkspaceSidebar.vue'
import {
  getInitialAttachmentDirectories,
  saveAttachmentDirectories,
  type AttachmentDirectories,
} from './lib/attachmentDirectories'
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
const attachmentDirectories = ref(getInitialAttachmentDirectories())
const draftAttachmentDirectories = ref<AttachmentDirectories>({ ...attachmentDirectories.value })
const sidebarWidth = ref(getInitialSidebarWidth())
const isResizingSidebar = ref(false)
const collapsedFolderPaths = ref<Set<string>>(new Set())
const menuEventCleanups: Array<() => void> = []
const showEditorSearch = ref(false)
const searchPanel = ref<{ focus: () => void } | null>(null)

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
  await createMarkdownInTree('')
}

async function createMarkdownInTree(parentPath: string) {
  if (!workspace.value) return
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
  try {
    const result = await ElMessageBox.prompt('请输入文件夹名称', '新建子目录', {
      inputValue: '新建文件夹',
      confirmButtonText: '创建',
      cancelButtonText: '取消',
    })
    name = result.value.trim()
  } catch {
    return
  }
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
  try {
    const result = await ElMessageBox.prompt('请输入新的名称', '重命名', {
      inputValue: node.name,
      confirmButtonText: '重命名',
      cancelButtonText: '取消',
    })
    name = result.value.trim()
  } catch {
    return
  }
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
    await ElMessageBox.confirm(`删除「${node.name}」？此操作无法撤销。`, '删除项目', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
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
}

async function openEditorSearch() {
  showEditorSearch.value = true
  await nextTick()
  searchPanel.value?.focus()
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
    draftAttachmentDirectories.value = { ...attachmentDirectories.value }
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
  draftAttachmentDirectories.value = { ...attachmentDirectories.value }
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

function setDraftAttachmentDirectory(key: keyof AttachmentDirectories, value: string) {
  draftAttachmentDirectories.value = {
    ...draftAttachmentDirectories.value,
    [key]: value,
  }
}

async function selectDraftAttachmentDirectory(key: keyof AttachmentDirectories) {
  try {
    const selected = await SelectAttachmentDirectory(key)
    if (!selected) {
      return
    }
    setDraftAttachmentDirectory(key, selected)
  } catch (error) {
    setError(error)
  }
}

function saveSettings() {
  layoutFontSizes.value = saveLayoutFontSizes(draftLayoutFontSizes.value)
  draftLayoutFontSizes.value = { ...layoutFontSizes.value }
  editorWidth.value = saveEditorWidth(draftEditorWidth.value)
  draftEditorWidth.value = editorWidth.value
  attachmentDirectories.value = saveAttachmentDirectories(draftAttachmentDirectories.value)
  draftAttachmentDirectories.value = { ...attachmentDirectories.value }
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
  saveCollapsedFolderPaths(workspace.value.rootPath, [...next])
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
  saveCollapsedFolderPaths(workspace.value.rootPath, next)
}

function updateCollapsedFolderPathsAfterDelete(path: string) {
  if (!workspace.value) return
  const next = [...collapsedFolderPaths.value].filter(
    (collapsedPath) => !isPathInsideTreeItem(collapsedPath, path),
  )
  collapsedFolderPaths.value = new Set(next)
  saveCollapsedFolderPaths(workspace.value.rootPath, next)
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
    await ElMessageBox.confirm(
      `粘贴图片或文件前，请先在设置中配置${missingDirectories.join('和')}。`,
      '未配置附件目录',
      {
        confirmButtonText: '去设置',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
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
  ElMessage.error(message)
}
</script>

<template>
  <div class="app-shell">
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
        />

        <EditorSurface
          v-model="editorContent"
          :document="activeDocument"
          :resolve-image-source="resolveEditorImageSource"
          @paste-files="handlePasteFiles"
          @insert-markdown="insertMarkdown"
        />
      </main>

      <UtilityRail
        :active-panel="activeUtilityPanel"
        :drawer-open="showUtilityDrawer"
        :theme="theme"
        :save-state="activeSaveState"
        :search-open="showEditorSearch"
        @select="toggleUtilityPanel"
        @search="openEditorSearch"
        @save="flushSave"
        @toggle-theme="switchTheme"
      />
      <UtilityDrawer
        v-model="showUtilityDrawer"
        :active-panel="activeUtilityPanel"
        :outline="outline"
        :outline-font-size="layoutFontSizes.outline"
        :draft-layout-font-sizes="draftLayoutFontSizes"
        :draft-editor-width="draftEditorWidth"
        :draft-attachment-directories="draftAttachmentDirectories"
        @update-font-size="setDraftLayoutFontSize"
        @update-editor-width="setDraftEditorWidth"
        @update-attachment-directory="setDraftAttachmentDirectory"
        @select-attachment-directory="selectDraftAttachmentDirectory"
        @cancel-settings="closeSettings"
        @save-settings="saveSettings"
      />
    </div>
  </div>
</template>
