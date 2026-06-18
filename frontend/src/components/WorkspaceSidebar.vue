<script setup lang="ts">
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen, Search } from '@lucide/vue'
import { ElEmpty, ElInput, ElScrollbar, ElTree } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { main } from '../../wailsjs/go/models'

const workspaceRootPath = '__donote_workspace_root__'

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
}>()

const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: (data: main.FileNode) => data.type !== 'folder',
}

const treeRef = ref<InstanceType<typeof ElTree>>()
const fileTreeQuery = ref('')
const workspaceRootCollapsed = ref(false)

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

watch(fileTreeQuery, (query) => {
  treeRef.value?.filter(query)
})

watch(
  () => props.workspaceName,
  () => {
    workspaceRootCollapsed.value = false
  },
)

function handleNodeClick(node: main.FileNode) {
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
  </aside>
</template>
