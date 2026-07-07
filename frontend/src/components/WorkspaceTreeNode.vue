<script setup lang="ts">
import {
  ChevronDown,
  ChevronRight,
  FilePenLine,
  FolderClosed,
  FolderOpen,
  NotebookTabs,
} from '@lucide/vue'
import { computed } from 'vue'
import { main } from '../../wailsjs/go/models'

const workspaceRootPath = '__donote_workspace_root__'

const props = defineProps<{
  node: main.FileNode
  depth: number
  activeFilePath: string
  expandedPathSet: Set<string>
  forceExpanded: boolean
}>()

const emit = defineEmits<{
  (event: 'select-file', path: string): void
  (event: 'toggle-folder', path: string, expanded: boolean): void
  (event: 'open-context-menu', mouseEvent: MouseEvent, node: main.FileNode): void
}>()

const expanded = computed(() => props.node.type === 'folder' && props.expandedPathSet.has(props.node.path))
const effectiveExpanded = computed(
  () => props.node.type === 'folder' && (expanded.value || props.forceExpanded),
)
const children = computed(() => props.node.children ?? [])

function treeNodeTestId(node: main.FileNode) {
  if (node.path === workspaceRootPath) {
    return 'workspace-root'
  }
  return node.type === 'file' ? `file-${node.path}` : `folder-${node.path}`
}

function treeNodeTitle(node: main.FileNode) {
  return node.path === workspaceRootPath ? node.name : node.path
}

function treeNodeAriaLabel(node: main.FileNode) {
  if (node.type === 'file') {
    return `打开文件 ${node.name}`
  }

  const nodeKind = node.path === workspaceRootPath ? '工作区' : '文件夹'
  return `${effectiveExpanded.value ? '折叠' : '展开'}${nodeKind} ${node.name}`
}

function handleClick() {
  if (props.node.type === 'file') {
    emit('select-file', props.node.path)
    return
  }

  emit('toggle-folder', props.node.path, !effectiveExpanded.value)
}

function handleContextMenu(event: MouseEvent) {
  emit('open-context-menu', event, props.node)
}

function openContextMenuFromKeyboard(event: KeyboardEvent) {
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
    return
  }
  event.preventDefault()
  event.stopPropagation()
  const row = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const rect = row?.getBoundingClientRect()
  emit(
    'open-context-menu',
    new MouseEvent('contextmenu', {
      clientX: rect ? rect.left + 24 : 8,
      clientY: rect ? rect.top + Math.min(rect.height, 32) : 8,
    }),
    props.node,
  )
}
</script>

<template>
  <button
    class="tree-row file-tree-node"
    :class="{
      folder: node.type === 'folder',
      'workspace-root': node.path === workspaceRootPath,
      active: node.path === activeFilePath,
    }"
    :aria-current="node.path === activeFilePath ? 'page' : undefined"
    :aria-expanded="node.type === 'folder' ? effectiveExpanded : undefined"
    :aria-label="treeNodeAriaLabel(node)"
    :data-test="treeNodeTestId(node)"
    :style="{ '--tree-depth': depth }"
    :title="treeNodeTitle(node)"
    type="button"
    @click.stop="handleClick"
    @contextmenu.prevent.stop="handleContextMenu"
    @keydown="openContextMenuFromKeyboard"
  >
    <span
      class="file-tree-node__chevron"
      :class="{ 'file-tree-node__chevron--spacer': node.type !== 'folder' }"
      aria-hidden="true"
    >
      <ChevronRight
        v-if="node.type === 'folder' && !effectiveExpanded"
        :size="14"
        :stroke-width="2.15"
      />
      <ChevronDown v-else-if="node.type === 'folder'" :size="14" :stroke-width="2.15" />
    </span>
    <span
      class="file-tree-node__icon"
      :class="{
        'file-tree-node__icon--workspace': node.path === workspaceRootPath,
        'file-tree-node__icon--folder': node.type === 'folder' && node.path !== workspaceRootPath,
        'file-tree-node__icon--file': node.type === 'file',
      }"
      aria-hidden="true"
    >
      <NotebookTabs v-if="node.path === workspaceRootPath" :size="15" :stroke-width="1.9" />
      <FolderOpen
        v-else-if="node.type === 'folder' && effectiveExpanded"
        :size="15"
        :stroke-width="1.9"
      />
      <FolderClosed v-else-if="node.type === 'folder'" :size="15" :stroke-width="1.9" />
      <FilePenLine v-else :size="15" :stroke-width="1.9" />
    </span>
    <span class="file-tree-node__label">
      <span class="file-tree-node__name">{{ node.name }}</span>
    </span>
  </button>

  <template v-if="node.type === 'folder' && effectiveExpanded">
    <WorkspaceTreeNode
      v-for="child in children"
      :key="child.path"
      :node="child"
      :depth="depth + 1"
      :active-file-path="activeFilePath"
      :expanded-path-set="expandedPathSet"
      :force-expanded="forceExpanded"
      @select-file="emit('select-file', $event)"
      @toggle-folder="(path, expandedValue) => emit('toggle-folder', path, expandedValue)"
      @open-context-menu="(event, contextNode) => emit('open-context-menu', event, contextNode)"
    />
  </template>
</template>
