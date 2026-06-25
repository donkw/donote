<script setup lang="ts">
import { NDrawer, NDrawerContent } from 'naive-ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'
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
  workspaceRoot: string
  layoutFontSizes: LayoutFontSizes
  editorWidth: number
  attachmentDirectories: AttachmentDirectories
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'update-font-size', area: LayoutFontSizeArea, value: number): void
  (event: 'update-editor-width', value: number): void
  (event: 'update-attachment-directory', key: keyof AttachmentDirectories, value: string): void
  (event: 'select-attachment-directory', key: keyof AttachmentDirectories): void
  (event: 'select-workspace'): void
}>()

const titles: Record<UtilityPanel, string> = {
  outline: '大纲',
  settings: '设置',
}

const drawerHost = ref<HTMLElement | null>(null)
const drawerTeleportTarget = document.createElement('div')

onMounted(() => {
  drawerHost.value?.appendChild(drawerTeleportTarget)
})

onBeforeUnmount(() => {
  drawerTeleportTarget.remove()
})

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

function emitSelectWorkspace() {
  emit('select-workspace')
}
</script>

<template>
  <div ref="drawerHost" />
  <NDrawer
    v-if="modelValue"
    class="utility-drawer"
    :show="modelValue"
    :to="drawerTeleportTarget"
    placement="right"
    :width="320"
    @update:show="$emit('update:modelValue', $event)"
  >
    <NDrawerContent :title="titles[activePanel]" closable>
      <OutlinePanel
        v-if="activePanel === 'outline'"
        :items="props.outline"
        :font-size="props.outlineFontSize"
      />
      <SettingsPanel
        v-else
        :model-value="layoutFontSizes"
        :workspace-root="workspaceRoot"
        :editor-width="editorWidth"
        :attachment-directories="attachmentDirectories"
        @update-font-size="emitFontSize"
        @update-editor-width="emitEditorWidth"
        @update-attachment-directory="emitAttachmentDirectory"
        @select-attachment-directory="emitSelectAttachmentDirectory"
        @select-workspace="emitSelectWorkspace"
      />
    </NDrawerContent>
  </NDrawer>
</template>
