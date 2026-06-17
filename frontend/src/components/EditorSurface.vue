<script setup lang="ts">
import { FolderOpen, Pencil, Trash2 } from '@lucide/vue'
import { ElButton, ElEmpty, ElScrollbar, ElTooltip } from 'element-plus'
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
  (event: 'open-workspace'): void
}>()
</script>

<template>
  <section class="editor-surface">
    <template v-if="document">
      <div class="document-toolbar">
        <div class="document-heading">
          <p class="document-label">当前笔记</p>
          <h1>{{ document.name }}</h1>
        </div>
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

      <ElScrollbar class="milkdown-shell">
        <div class="milkdown-editor">
          <MilkdownEditor
            :model-value="modelValue"
            :active-path="document.path"
            @update:model-value="$emit('update:modelValue', $event)"
          />
        </div>
      </ElScrollbar>
    </template>

    <ElEmpty v-else class="empty-state" description="选择一个笔记文件夹开始写作">
      <ElButton type="primary" @click="$emit('open-workspace')">
        <FolderOpen :size="18" />
        <span>打开文件夹</span>
      </ElButton>
    </ElEmpty>
  </section>
</template>
