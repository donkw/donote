<script setup lang="ts">
import { FolderOpen } from '@lucide/vue'
import { NButton, NEmpty } from 'naive-ui'
import type { OpenDocument } from '../types/app'
import MilkdownEditor from './MilkdownEditor.vue'

type ResolveImageSource = (source: string, activePath: string) => Promise<string>

withDefaults(
  defineProps<{
    document: OpenDocument | null
    modelValue: string
    workspaceOpen?: boolean
    loading?: boolean
    resolveImageSource?: ResolveImageSource
    searchQuery?: string
    activeSearchIndex?: number
  }>(),
  {
    searchQuery: '',
    activeSearchIndex: -1,
  },
)

defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'sync-clean-content', value: string): void
  (event: 'paste-files', files: File[]): void
  (event: 'insert-markdown', markdown: string): void
  (event: 'open-workspace'): void
  (event: 'create-note'): void
}>()
</script>

<template>
  <section class="editor-surface" :aria-busy="loading">
    <div v-if="loading" class="editor-loading" role="status">正在打开笔记…</div>
    <template v-if="document">
      <MilkdownEditor
        :model-value="modelValue"
        :active-path="document.path"
        :search-query="searchQuery"
        :active-search-index="activeSearchIndex"
        :resolve-image-source="resolveImageSource"
        @update:model-value="$emit('update:modelValue', $event)"
        @sync-clean-content="$emit('sync-clean-content', $event)"
        @paste-files="$emit('paste-files', $event)"
        @insert-markdown="$emit('insert-markdown', $event)"
      />
    </template>

    <NEmpty
      v-else
      class="empty-state"
      :description="workspaceOpen ? '写下你的第一个想法' : '选择一个笔记文件夹开始写作'"
      :image-size="56"
    >
      <template #icon>
        <FolderOpen :size="38" :stroke-width="1.8" />
      </template>
      <template #extra>
        <p class="empty-state-hint">{{ workspaceOpen ? '从左侧选择笔记，或新建一篇，开始记录。' : '笔记以 Markdown 文件保存在你的电脑，随时可用。' }}</p>
        <NButton v-if="workspaceOpen" data-test="empty-create-note" type="primary" @click="$emit('create-note')">
          新建笔记
        </NButton>
        <NButton v-else data-test="empty-open-workspace" type="primary" @click="$emit('open-workspace')">
          打开笔记文件夹
        </NButton>
      </template>
    </NEmpty>
  </section>
</template>
