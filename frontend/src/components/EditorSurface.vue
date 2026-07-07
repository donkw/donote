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
}>()
</script>

<template>
  <section class="editor-surface">
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
      description="选择一个笔记文件夹开始写作"
      :image-size="56"
    >
      <template #icon>
        <FolderOpen :size="38" :stroke-width="1.8" />
      </template>
      <template #extra>
        <NButton data-test="empty-open-workspace" type="primary" @click="$emit('open-workspace')">
          打开笔记文件夹
        </NButton>
      </template>
    </NEmpty>
  </section>
</template>
