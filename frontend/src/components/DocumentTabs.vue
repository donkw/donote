<script setup lang="ts">
import { FileText, X } from '@lucide/vue'
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

function isActiveDocument(document: OpenDocument) {
  return document.path === props.activePath
}

function selectDocument(document: OpenDocument) {
  emit('update:activePath', document.path)
}
</script>

<template>
  <div
    v-if="documents.length"
    class="document-tabs el-tabs el-tabs--card"
    role="tablist"
    aria-label="打开的笔记"
  >
    <div class="el-tabs__header">
      <div class="el-tabs__nav-wrap">
        <div class="el-tabs__nav-scroll">
          <div class="el-tabs__nav" role="presentation">
            <div
              v-for="document in props.documents"
              :key="document.path"
              class="document-tab el-tabs__item"
              :class="{ 'is-active': isActiveDocument(document) }"
              role="presentation"
            >
              <button
                :data-test="`tab-${document.path}`"
                class="document-tab-label"
                type="button"
                role="tab"
                :aria-selected="isActiveDocument(document) ? 'true' : 'false'"
                :tabindex="isActiveDocument(document) ? 0 : -1"
                :title="document.path"
                @click="selectDocument(document)"
              >
                <FileText :size="14" aria-hidden="true" />
                <span>{{ document.name }}</span>
                <span
                  v-if="isDocumentDirty(document)"
                  class="dirty-mark"
                  aria-label="未保存"
                >
                  *
                </span>
              </button>
              <button
                class="tab-close-button"
                :data-test="`tab-close-${document.path}`"
                type="button"
                :aria-label="`关闭 ${document.name}`"
                :title="`关闭 ${document.name}`"
                @click.stop="emit('close', document)"
              >
                <X :size="13" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="el-tabs__content" />
  </div>
</template>
