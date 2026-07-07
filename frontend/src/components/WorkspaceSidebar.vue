<script setup lang="ts">
import { FilePlus2, FolderPlus, NotebookTabs, Search } from '@lucide/vue'
import { NButton, NEmpty, NInput, NTooltip } from 'naive-ui'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { main } from '../../wailsjs/go/models'
import WorkspaceTreeNode from './WorkspaceTreeNode.vue'

const workspaceRootPath = '__donote_workspace_root__'
type ContextActionKey = 'create-folder' | 'create-markdown' | 'rename' | 'delete'
type ContextMenuState = {
  node: main.FileNode
  x: number
  y: number
}

const props = defineProps<{
  workspaceName: string
  tree: main.FileNode[]
  activeFilePath: string
  expandedFolderPaths: string[]
}>()

const emit = defineEmits<{
  (event: 'select-file', path: string): void
  (event: 'folder-expanded', path: string): void
  (event: 'folder-collapsed', path: string): void
  (event: 'create-folder', parentPath: string): void
  (event: 'create-markdown', parentPath: string): void
  (event: 'rename-node', path: string): void
  (event: 'delete-node', path: string): void
}>()

const fileTreeQuery = ref('')
const workspaceRootCollapsed = ref(false)
const contextMenu = ref<ContextMenuState | null>(null)
const contextMenuElement = ref<HTMLElement | null>(null)
const isFiltering = computed(() => fileTreeQuery.value.trim().length > 0)

const workspaceTree = computed<main.FileNode[]>(() => {
  if (!props.workspaceName) {
    return []
  }

  return [
    main.FileNode.createFrom({
      name: props.workspaceName,
      path: workspaceRootPath,
      type: 'folder',
      children: props.tree,
    }),
  ]
})

const displayTree = computed<main.FileNode[]>(() => filterTree(workspaceTree.value, fileTreeQuery.value))

const expandedPathSet = computed(() => {
  const expandedPaths = new Set(props.expandedFolderPaths)
  if (props.workspaceName && !workspaceRootCollapsed.value) {
    expandedPaths.add(workspaceRootPath)
  } else {
    expandedPaths.delete(workspaceRootPath)
  }
  return expandedPaths
})

const contextActions = computed<Array<{ key: ContextActionKey; label: string }>>(() => {
  const node = contextMenu.value?.node
  if (!node) {
    return []
  }
  if (node.type === 'file') {
    return [
      { key: 'rename', label: '重命名' },
      { key: 'delete', label: '删除' },
    ]
  }

  const createActions: Array<{ key: ContextActionKey; label: string }> = [
    { key: 'create-folder', label: '新建子目录' },
    { key: 'create-markdown', label: '新建 md' },
  ]
  if (node.path === workspaceRootPath) {
    return createActions
  }
  return [...createActions, { key: 'rename', label: '重命名' }]
})

watch(
  () => props.workspaceName,
  () => {
    workspaceRootCollapsed.value = false
    closeContextMenu()
  },
)

onMounted(() => {
  window.addEventListener('click', closeContextMenu)
  window.addEventListener('keydown', closeContextMenuFromKeyboard)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('keydown', closeContextMenuFromKeyboard)
})

function filterTree(nodes: main.FileNode[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return nodes
  }

  return filterTreeNodes(nodes, normalizedQuery)
}

function filterTreeNodes(nodes: main.FileNode[], normalizedQuery: string): main.FileNode[] {
  return nodes.flatMap((node) => {
    const filteredChildren = node.children ? filterTreeNodes(node.children, normalizedQuery) : []
    const matchesNode =
      node.name.toLocaleLowerCase().includes(normalizedQuery) ||
      node.path.toLocaleLowerCase().includes(normalizedQuery)

    if (!matchesNode && filteredChildren.length === 0) {
      return []
    }

    return [
      main.FileNode.createFrom({
        name: node.name,
        path: node.path,
        type: node.type,
        children: node.type === 'folder' ? filteredChildren : undefined,
      }),
    ]
  })
}

function findNodeByPath(nodes: main.FileNode[], path: string): main.FileNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node
    }

    const match = findNodeByPath(node.children ?? [], path)
    if (match) {
      return match
    }
  }

  return null
}

function selectFile(path: string) {
  closeContextMenu()
  emit('select-file', path)
}

function toggleFolder(path: string, expanded: boolean) {
  closeContextMenu()
  const node = findNodeByPath(displayTree.value, path)
  if (!node || node.type !== 'folder') {
    return
  }

  if (node.path === workspaceRootPath) {
    workspaceRootCollapsed.value = !expanded
    return
  }

  if (expanded) {
    emit('folder-expanded', node.path)
  } else {
    emit('folder-collapsed', node.path)
  }
}

function openContextMenu(event: MouseEvent, node: main.FileNode) {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.value = {
    node,
    x: Math.max(8, event.clientX),
    y: Math.max(8, event.clientY),
  }
  void nextTick(() => {
    contextMenuElement.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  })
}

function closeContextMenu() {
  contextMenu.value = null
}

function closeContextMenuFromKeyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeContextMenu()
  }
}

function createRootMarkdown() {
  closeContextMenu()
  emit('create-markdown', '')
}

function createRootFolder() {
  closeContextMenu()
  emit('create-folder', '')
}

function runContextAction(action: ContextActionKey) {
  const node = contextMenu.value?.node
  if (!node) {
    return
  }
  closeContextMenu()

  if (action === 'create-folder') {
    emit('create-folder', node.path === workspaceRootPath ? '' : node.path)
    return
  }
  if (action === 'create-markdown') {
    emit('create-markdown', node.path === workspaceRootPath ? '' : node.path)
    return
  }
  if (action === 'rename' && node.path !== workspaceRootPath) {
    emit('rename-node', node.path)
    return
  }
  if (action === 'delete' && node.type === 'file') {
    emit('delete-node', node.path)
  }
}
</script>

<template>
  <aside class="sidebar workspace-sidebar">
    <div class="sidebar-header">
      <div v-if="workspaceName || tree.length" class="workspace-title">
        <span class="workspace-title__mark" aria-hidden="true">
          <NotebookTabs :size="16" :stroke-width="2" />
        </span>
        <span class="workspace-title__copy">
          <strong>{{ workspaceName || '未命名工作区' }}</strong>
          <span>Markdown workspace</span>
        </span>
        <span class="workspace-actions">
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton
                class="workspace-action"
                data-test="new-note"
                size="small"
                quaternary
                aria-label="新建笔记"
                title="新建笔记"
                @click="createRootMarkdown"
              >
                <FilePlus2 :size="15" />
              </NButton>
            </template>
            新建笔记
          </NTooltip>
          <NTooltip placement="bottom">
            <template #trigger>
              <NButton
                class="workspace-action"
                data-test="new-folder"
                size="small"
                quaternary
                aria-label="新建文件夹"
                title="新建文件夹"
                @click="createRootFolder"
              >
                <FolderPlus :size="15" />
              </NButton>
            </template>
            新建文件夹
          </NTooltip>
        </span>
      </div>

      <div v-if="workspaceName || tree.length" data-test="file-tree-search" class="file-tree-search">
        <NInput
          v-model:value="fileTreeQuery"
          placeholder="搜索文件"
          clearable
          :input-props="{ 'aria-label': '搜索文件' }"
        >
          <template #prefix>
            <Search :size="15" />
          </template>
        </NInput>
      </div>
      <NEmpty v-else class="sidebar-empty" description="还没有打开笔记文件夹" :image-size="56" />
    </div>

    <div v-if="displayTree.length" class="file-tree-scroll">
      <div class="file-tree">
        <WorkspaceTreeNode
          v-for="node in displayTree"
          :key="node.path"
          :node="node"
          :depth="0"
          :active-file-path="activeFilePath"
          :expanded-path-set="expandedPathSet"
          :force-expanded="isFiltering"
          @select-file="selectFile"
          @toggle-folder="toggleFolder"
          @open-context-menu="openContextMenu"
        />
      </div>
    </div>

    <div
      v-if="contextMenu"
      ref="contextMenuElement"
      data-test="file-tree-context-menu"
      class="file-tree-context-menu"
      role="menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <button
        v-for="action in contextActions"
        :key="action.key"
        class="context-menu-item"
        :class="{ danger: action.key === 'delete' }"
        :data-test="`context-${action.key}`"
        type="button"
        role="menuitem"
        @click="runContextAction(action.key)"
      >
        {{ action.label }}
      </button>
    </div>
  </aside>
</template>
