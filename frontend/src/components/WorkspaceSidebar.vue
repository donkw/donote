<script setup lang="ts">
import { ChevronDown, ChevronRight, FileText, Folder, Search } from '@lucide/vue'
import { ElEmpty, ElInput, ElScrollbar, ElTree } from 'element-plus'
import { ref, watch } from 'vue'
import type { main } from '../../wailsjs/go/models'

defineProps<{
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

watch(fileTreeQuery, (query) => {
  treeRef.value?.filter(query)
})

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
    emit('folder-collapsed', node.path)
  } else {
    treeNode.expand()
    emit('folder-expanded', node.path)
  }
}

function handleNodeExpand(node: main.FileNode) {
  if (node.type === 'folder') {
    emit('folder-expanded', node.path)
  }
}

function handleNodeCollapse(node: main.FileNode) {
  if (node.type === 'folder') {
    emit('folder-collapsed', node.path)
  }
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
</script>

<template>
  <aside class="sidebar workspace-sidebar">
    <div class="sidebar-header">
      <div v-if="workspaceName" class="workspace-title">
        <Folder :size="16" />
        <span>{{ workspaceName }}</span>
      </div>
      <ElEmpty v-else class="sidebar-empty" description="还没有打开笔记文件夹" :image-size="56" />

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
    </div>

    <ElScrollbar v-if="tree.length" class="file-tree-scroll">
      <ElTree
        ref="treeRef"
        class="file-tree"
        :data="tree"
        node-key="path"
        :props="treeProps"
        :current-node-key="activeFilePath"
        :default-expanded-keys="expandedFolderPaths"
        :expand-on-click-node="false"
        :filter-node-method="filterTreeNode"
        highlight-current
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template #default="{ node, data }">
          <button
            class="tree-row file-tree-node"
            :class="{ folder: data.type === 'folder', active: data.path === activeFilePath }"
            :data-test="data.type === 'file' ? `file-${data.path}` : `folder-${data.path}`"
            :style="treeNodeStyle(node.level)"
            type="button"
            @click.stop="handleNodeClick(data)"
          >
            <ChevronRight v-if="data.type === 'folder' && !node.expanded" :size="14" />
            <ChevronDown v-else-if="data.type === 'folder'" :size="14" />
            <FileText v-else :size="14" />
            <span class="file-tree-node__name">{{ data.name }}</span>
          </button>
        </template>
      </ElTree>
    </ElScrollbar>
  </aside>
</template>
