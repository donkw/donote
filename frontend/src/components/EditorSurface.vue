<script setup lang="ts">
import { ElEmpty } from 'element-plus'
import type { OpenDocument } from '../types/app'
import MilkdownEditor from './MilkdownEditor.vue'

defineProps<{
  document: OpenDocument | null
  modelValue: string
}>()

defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'paste-files', files: File[]): void
}>()
</script>

<template>
  <section class="editor-surface">
    <template v-if="document">
      <MilkdownEditor
        :model-value="modelValue"
        :active-path="document.path"
        @update:model-value="$emit('update:modelValue', $event)"
        @paste-files="$emit('paste-files', $event)"
      />
    </template>

    <ElEmpty v-else class="empty-state" description="选择一个笔记文件夹开始写作" />
  </section>
</template>
