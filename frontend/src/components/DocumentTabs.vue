<script setup lang="ts">
import { FileText, X } from '@lucide/vue'
import { ElTabPane, ElTabs } from 'element-plus'
import { isDocumentDirty } from '../lib/markdownDirty'
import type { OpenDocument } from '../types/app'

const props = defineProps<{
  documents: OpenDocument[]
  activePath: string
}>()

const emit = defineEmits<{
  (event: 'update:activePath', path: string): void
  (event: 'close', document: OpenDocument): void
}>()

function handleTabChange(path: string | number) {
  emit('update:activePath', String(path))
}
</script>

<template>
  <ElTabs
    v-if="documents.length"
    class="document-tabs"
    type="card"
    :model-value="activePath"
    @update:model-value="handleTabChange"
  >
    <ElTabPane v-for="document in props.documents" :key="document.path" :name="document.path">
      <template #label>
        <span :data-test="`tab-${document.path}`" class="document-tab-label">
          <FileText :size="14" />
          <span>{{ document.name }}</span>
          <span v-if="isDocumentDirty(document)" class="dirty-mark">*</span>
          <button
            class="tab-close-button"
            :data-test="`tab-close-${document.path}`"
            type="button"
            :title="`关闭 ${document.name}`"
            @click.stop="emit('close', document)"
          >
            <X :size="13" />
          </button>
        </span>
      </template>
    </ElTabPane>
  </ElTabs>
</template>
