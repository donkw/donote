<script setup lang="ts">
import { ElDrawer } from 'element-plus'
import type { AttachmentDirectories } from '../lib/attachmentDirectories'
import type { LayoutFontSizeArea, LayoutFontSizes } from '../lib/layoutFontSizes'
import type { OutlineItem } from '../lib/outline'
import type { UtilityPanel } from '../types/app'
import OutlinePanel from './OutlinePanel.vue'
import SettingsPanel from './SettingsPanel.vue'

const props = defineProps<{
  modelValue: boolean
  activePanel: UtilityPanel
  outline: OutlineItem[]
  outlineFontSize: number
  draftLayoutFontSizes: LayoutFontSizes
  draftEditorWidth: number
  draftAttachmentDirectories: AttachmentDirectories
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'update-font-size', area: LayoutFontSizeArea, value: number): void
  (event: 'update-editor-width', value: number): void
  (event: 'update-attachment-directory', key: keyof AttachmentDirectories, value: string): void
  (event: 'select-attachment-directory', key: keyof AttachmentDirectories): void
  (event: 'cancel-settings'): void
  (event: 'save-settings'): void
}>()

const titles: Record<UtilityPanel, string> = {
  outline: '大纲',
  settings: '设置',
}

function emitFontSize(area: LayoutFontSizeArea, value: number) {
  emit('update-font-size', area, value)
}

function emitEditorWidth(value: number) {
  emit('update-editor-width', value)
}

function emitAttachmentDirectory(key: keyof AttachmentDirectories, value: string) {
  emit('update-attachment-directory', key, value)
}

function emitSelectAttachmentDirectory(key: keyof AttachmentDirectories) {
  emit('select-attachment-directory', key)
}
</script>

<template>
  <ElDrawer
    v-if="modelValue"
    class="utility-drawer"
    :model-value="modelValue"
    :title="titles[activePanel]"
    destroy-on-close
    direction="rtl"
    size="320px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <OutlinePanel
      v-if="activePanel === 'outline'"
      :items="props.outline"
      :font-size="props.outlineFontSize"
    />
    <SettingsPanel
      v-else
      :model-value="draftLayoutFontSizes"
      :editor-width="draftEditorWidth"
      :attachment-directories="draftAttachmentDirectories"
      @update-font-size="emitFontSize"
      @update-editor-width="emitEditorWidth"
      @update-attachment-directory="emitAttachmentDirectory"
      @select-attachment-directory="emitSelectAttachmentDirectory"
      @cancel="$emit('cancel-settings')"
      @save="$emit('save-settings')"
    />
  </ElDrawer>
</template>
