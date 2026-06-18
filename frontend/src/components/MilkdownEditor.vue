<template>
  <MilkdownProvider>
    <div class="milkdown-shell" @paste.capture="handlePaste">
      <FormatToolbar
        class="editor-format-toolbar"
        tooltip-placement="right"
        @insert-markdown="$emit('insert-markdown', $event)"
      />
      <div class="milkdown-editor">
        <MilkdownHost
          :active-path="activePath"
          :model-value="modelValue"
          :resolve-image-source="resolveImageSource"
          @update:model-value="emitUpdate"
        />
      </div>
    </div>
  </MilkdownProvider>
</template>

<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue'
import FormatToolbar from './FormatToolbar.vue'
import MilkdownHost from './MilkdownHost.vue'

type ResolveImageSource = (source: string, activePath: string) => Promise<string>

defineProps<{
  modelValue: string
  activePath: string
  resolveImageSource?: ResolveImageSource
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'paste-files', files: File[]): void
  (event: 'insert-markdown', markdown: string): void
}>()

function emitUpdate(value: string) {
  emit('update:modelValue', value)
}

function handlePaste(event: ClipboardEvent) {
  const files = collectClipboardFiles(event)
  if (files.length === 0) {
    return
  }
  event.preventDefault()
  emit('paste-files', files)
}

function collectClipboardFiles(event: ClipboardEvent): File[] {
  const clipboardData = event.clipboardData
  if (!clipboardData) {
    return []
  }

  const files = new Map<string, File>()
  Array.from(clipboardData.files ?? []).forEach((file) => {
    files.set(fileKey(file), file)
  })
  Array.from(clipboardData.items ?? []).forEach((item) => {
    if (item.kind !== 'file') {
      return
    }
    const file = item.getAsFile()
    if (file) {
      files.set(fileKey(file), file)
    }
  })
  return [...files.values()]
}

function fileKey(file: File) {
  return `${file.name}:${file.type}:${file.size}:${file.lastModified}`
}
</script>
