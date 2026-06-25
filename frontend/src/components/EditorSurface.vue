<script setup lang="ts">
import { NEmpty } from 'naive-ui'
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

    <NEmpty v-else class="empty-state" description="选择一个笔记文件夹开始写作" />
  </section>
</template>
