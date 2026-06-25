<script setup lang="ts">
import { FileText, X } from '@lucide/vue'
import { nextTick, ref, type ComponentPublicInstance } from 'vue'
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

const tabButtons = ref(new Map<string, HTMLButtonElement>())

function isActiveDocument(document: OpenDocument) {
  return document.path === props.activePath
}

function setTabButton(path: string, element: Element | ComponentPublicInstance | null) {
  if (element instanceof HTMLButtonElement) {
    tabButtons.value.set(path, element)
    return
  }

  tabButtons.value.delete(path)
}

function focusTab(path: string) {
  void nextTick(() => {
    tabButtons.value.get(path)?.focus()
  })
}

function selectDocument(document: OpenDocument, shouldFocus = false) {
  emit('update:activePath', document.path)
  if (shouldFocus) {
    focusTab(document.path)
  }
}

function selectDocumentAt(index: number) {
  const document = props.documents[index]
  if (!document) {
    return
  }

  selectDocument(document, true)
}

function handleTabKeydown(event: KeyboardEvent, document: OpenDocument) {
  const currentIndex = props.documents.findIndex(({ path }) => path === document.path)
  if (currentIndex === -1) {
    return
  }

  let targetIndex: number
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      targetIndex = (currentIndex + 1) % props.documents.length
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      targetIndex = (currentIndex - 1 + props.documents.length) % props.documents.length
      break
    case 'Home':
      targetIndex = 0
      break
    case 'End':
      targetIndex = props.documents.length - 1
      break
    default:
      return
  }

  event.preventDefault()
  selectDocumentAt(targetIndex)
}
</script>

<template>
  <div
    v-if="documents.length"
    class="document-tabs"
    role="tablist"
    aria-label="打开的笔记"
  >
    <div class="document-tabs__track" role="presentation">
      <div class="document-tabs__list" role="presentation">
        <div
          v-for="document in props.documents"
          :key="document.path"
          class="document-tab"
          :class="{ active: isActiveDocument(document) }"
          role="presentation"
        >
          <button
            :ref="(element) => setTabButton(document.path, element)"
            :data-test="`tab-${document.path}`"
            class="document-tab-label"
            type="button"
            role="tab"
            :aria-selected="isActiveDocument(document) ? 'true' : 'false'"
            :tabindex="isActiveDocument(document) ? 0 : -1"
            :title="document.path"
            @click="selectDocument(document)"
            @keydown="handleTabKeydown($event, document)"
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
</template>
