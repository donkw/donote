<script setup lang="ts">
import { ChevronDown, ChevronRight, FilePlus, FileText, Folder, FolderOpen } from '@lucide/vue'
import { ElButton, ElEmpty, ElScrollbar, ElTree } from 'element-plus'
import { ref } from 'vue'
import type { main } from '../../wailsjs/go/models'

defineProps<{
  workspaceName: string
  tree: main.FileNode[]
  activeFilePath: string
  expandedFolderPaths: string[]
}>()

const emit = defineEmits<{
  (event: 'open-workspace'): void
  (event: 'create-note'): void
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

function handleNodeClick(node: main.FileNode) {
  if (node.type === 'file') {
    emit('select-file', node.path)
    return
  }

  const treeNode = treeRef.value?.getNode(node)
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
</script>

<template>
  <aside class="sidebar workspace-sidebar">
    <div class="sidebar-actions">
      <ElButton data-test="open-workspace" type="primary" @click="$emit('open-workspace')">
        <FolderOpen :size="16" />
        <span>打开文件夹</span>
      </ElButton>
      <ElButton
        data-test="new-note"
        circle
        title="新建笔记"
        aria-label="新建笔记"
        @click="$emit('create-note')"
      >
        <FilePlus :size="17" />
      </ElButton>
    </div>

    <div v-if="workspaceName" class="workspace-title">
      <Folder :size="16" />
      <span>{{ workspaceName }}</span>
    </div>
    <ElEmpty v-else class="sidebar-empty" description="还没有打开笔记文件夹" :image-size="56" />

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
        highlight-current
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template #default="{ node, data }">
          <button
            class="tree-row file-tree-node"
            :class="{ folder: data.type === 'folder', active: data.path === activeFilePath }"
            :data-test="data.type === 'file' ? `file-${data.path}` : `folder-${data.path}`"
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
