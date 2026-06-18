<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue'
import { ElButton, ElEmpty, ElTooltip } from 'element-plus'
import type { OpenDocument } from '../types/app'
import MilkdownEditor from './MilkdownEditor.vue'

defineProps<{
  document: OpenDocument | null
  modelValue: string
}>()

defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'rename'): void
  (event: 'delete'): void
}>()
</script>

<template>
  <section class="editor-surface">
    <template v-if="document">
      <div class="document-toolbar">
        <div class="document-actions">
          <ElTooltip content="重命名" placement="bottom">
            <ElButton circle @click="$emit('rename')">
              <Pencil :size="17" />
            </ElButton>
          </ElTooltip>
          <ElTooltip content="删除" placement="bottom">
            <ElButton circle type="danger" @click="$emit('delete')">
              <Trash2 :size="17" />
            </ElButton>
          </ElTooltip>
        </div>
      </div>

      <MilkdownEditor
        :model-value="modelValue"
        :active-path="document.path"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </template>

    <ElEmpty v-else class="empty-state" description="选择一个笔记文件夹开始写作" />
  </section>
</template>
