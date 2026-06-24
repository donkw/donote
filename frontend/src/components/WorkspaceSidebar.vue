<script setup lang="ts">
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Search,
} from '@lucide/vue'
import { ElEmpty, ElInput, ElScrollbar, ElTree } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { main } from '../../wailsjs/go/models'

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

const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: (data: main.FileNode) => data.type !== 'folder',
}

const treeRef = ref<InstanceType<typeof ElTree>>()
const fileTreeQuery = ref('')
const workspaceRootCollapsed = ref(false)
const contextMenu = ref<ContextMenuState | null>(null)

const displayTree = computed<main.FileNode[]>(() => {
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

const expandedTreeKeys = computed(() => {
  if (!props.workspaceName || workspaceRootCollapsed.value) {
    return props.expandedFolderPaths
  }
  return [workspaceRootPath, ...props.expandedFolderPaths]
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

watch(fileTreeQuery, (query) => {
  treeRef.value?.filter(query)
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

function handleNodeClick(node: main.FileNode) {
  closeContextMenu()
  if (node.type === 'file') {
    emit('select-file', node.path)
    return
  }

  const treeNode = treeRef.value?.getNode(node.path)
  if (!treeNode) {
    return
  }

  if (treeNode.expanded) {
    treeNode.collapse()
    handleFolderExpansionChange(node, false)
  } else {
    treeNode.expand()
    handleFolderExpansionChange(node, true)
  }
}

function handleNodeExpand(node: main.FileNode) {
  handleFolderExpansionChange(node, true)
}

function handleNodeCollapse(node: main.FileNode) {
  handleFolderExpansionChange(node, false)
}

function filterTreeNode(query: string, node: main.FileNode) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return true
  }
  return (
    node.name.toLocaleLowerCase().includes(normalizedQuery) ||
    node.path.toLocaleLowerCase().includes(normalizedQuery)
  )
}

function treeNodeStyle(level: number) {
  return { '--tree-depth': Math.max(level - 1, 0) }
}

function treeNodeTestId(node: main.FileNode) {
  if (node.path === workspaceRootPath) {
    return 'workspace-root'
  }
  return node.type === 'file' ? `file-${node.path}` : `folder-${node.path}`
}

function openContextMenu(event: MouseEvent, node: main.FileNode) {
  event.preventDefault()
  event.stopPropagation()
  contextMenu.value = {
    node,
    x: Math.max(8, event.clientX),
    y: Math.max(8, event.clientY),
  }
}

function closeContextMenu() {
  contextMenu.value = null
}

function closeContextMenuFromKeyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeContextMenu()
  }
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

function handleFolderExpansionChange(node: main.FileNode, expanded: boolean) {
  if (node.type !== 'folder') {
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
</script>

<template>
  <aside class="sidebar workspace-sidebar">
    <div class="sidebar-header">
      <div v-if="workspaceName || tree.length" data-test="file-tree-search" class="file-tree-search">
        <ElInput
          v-model="fileTreeQuery"
          placeholder="搜索文件"
          clearable
          aria-label="搜索文件"
        >
          <template #prefix>
            <Search :size="15" />
          </template>
        </ElInput>
      </div>
      <ElEmpty v-else class="sidebar-empty" description="还没有打开笔记文件夹" :image-size="56" />
    </div>

    <ElScrollbar v-if="displayTree.length" class="file-tree-scroll">
      <ElTree
        ref="treeRef"
        class="file-tree"
        :data="displayTree"
        node-key="path"
        :props="treeProps"
        :current-node-key="activeFilePath"
        :default-expanded-keys="expandedTreeKeys"
        :expand-on-click-node="false"
        :filter-node-method="filterTreeNode"
        highlight-current
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template #default="{ node, data }">
          <button
            class="tree-row file-tree-node"
            :class="{
              folder: data.type === 'folder',
              'workspace-root': data.path === workspaceRootPath,
              active: data.path === activeFilePath,
            }"
            :data-test="treeNodeTestId(data)"
            :style="treeNodeStyle(node.level)"
            type="button"
            @click.stop="handleNodeClick(data)"
            @contextmenu.prevent.stop="openContextMenu($event, data)"
          >
            <ChevronRight v-if="data.type === 'folder' && !node.expanded" :size="14" />
            <ChevronDown v-else-if="data.type === 'folder'" :size="14" />
            <FolderOpen v-if="data.type === 'folder' && node.expanded" :size="14" />
            <Folder v-else-if="data.type === 'folder'" :size="14" />
            <FileText v-else :size="14" />
            <span class="file-tree-node__name">{{ data.name }}</span>
          </button>
        </template>
      </ElTree>
    </ElScrollbar>

    <div
      v-if="contextMenu"
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
