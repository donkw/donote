<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, NInputNumber, NSlider } from 'naive-ui'
import type { AttachmentDirectories } from '../lib/attachmentDirectories'
import { editorWidthControl } from '../lib/editorWidth'
import {
  layoutFontSizeControls,
  type LayoutFontSizeArea,
  type LayoutFontSizes,
} from '../lib/layoutFontSizes'

defineProps<{
  modelValue: LayoutFontSizes
  workspaceRoot: string
  editorWidth: number
  attachmentDirectories: AttachmentDirectories
}>()

const emit = defineEmits<{
  (event: 'update-font-size', area: LayoutFontSizeArea, value: number): void
  (event: 'update-editor-width', value: number): void
  (event: 'update-attachment-directory', key: keyof AttachmentDirectories, value: string): void
  (event: 'select-attachment-directory', key: keyof AttachmentDirectories): void
  (event: 'select-workspace'): void
}>()

const inputActionStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '8px',
  alignItems: 'center',
}

const numberControlStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 88px',
  gap: '10px',
  alignItems: 'center',
}

function emitEditorWidth(value: number | null) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    emit('update-editor-width', value)
  }
}

function emitFontSize(area: LayoutFontSizeArea, value: number | null) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    emit('update-font-size', area, value)
  }
}
</script>

<template>
  <div class="utility-panel settings-panel">
    <h2>设置</h2>
    <p class="panel-subtitle">工作目录</p>
    <NForm label-placement="top">
      <NFormItem label="当前工作目录">
        <div :style="inputActionStyle">
          <NInput
            :value="workspaceRoot"
            :input-props="{ 'data-test': 'settings-workspace-root' }"
            placeholder="未选择工作目录"
            readonly
          />
          <NButton data-test="select-workspace-root" @click="$emit('select-workspace')">
            选择
          </NButton>
        </div>
      </NFormItem>
    </NForm>

    <p class="panel-subtitle">编辑器布局</p>
    <NForm label-placement="top">
      <NFormItem :label="editorWidthControl.label">
        <div data-test="editor-width" :style="numberControlStyle">
          <NSlider
            :value="editorWidth"
            :min="editorWidthControl.min"
            :max="editorWidthControl.max"
            :step="editorWidthControl.step"
            @update:value="emitEditorWidth"
          />
          <NInputNumber
            :value="editorWidth"
            :min="editorWidthControl.min"
            :max="editorWidthControl.max"
            :step="editorWidthControl.step"
            :show-button="false"
            @update:value="emitEditorWidth"
          />
        </div>
      </NFormItem>
    </NForm>

    <p class="panel-subtitle">附件存储目录</p>
    <NForm label-placement="top">
      <NFormItem label="图片目录">
        <div :style="inputActionStyle">
          <NInput
            :value="attachmentDirectories.images"
            :input-props="{ 'data-test': 'attachment-image-dir' }"
            placeholder="例如 assets/images"
            @update:value="$emit('update-attachment-directory', 'images', $event)"
          />
          <NButton
            data-test="select-attachment-image-dir"
            @click="$emit('select-attachment-directory', 'images')"
          >
            选择
          </NButton>
        </div>
      </NFormItem>
      <NFormItem label="文件目录">
        <div :style="inputActionStyle">
          <NInput
            :value="attachmentDirectories.files"
            :input-props="{ 'data-test': 'attachment-file-dir' }"
            placeholder="例如 assets/files"
            @update:value="$emit('update-attachment-directory', 'files', $event)"
          />
          <NButton
            data-test="select-attachment-file-dir"
            @click="$emit('select-attachment-directory', 'files')"
          >
            选择
          </NButton>
        </div>
      </NFormItem>
    </NForm>

    <p class="panel-subtitle">布局字体大小</p>
    <NForm label-placement="top">
      <NFormItem
        v-for="control in layoutFontSizeControls"
        :key="control.key"
        :label="control.label"
      >
        <div :data-test="`font-size-${control.key}`" :style="numberControlStyle">
          <NSlider
            :value="modelValue[control.key]"
            :min="control.min"
            :max="control.max"
            @update:value="emitFontSize(control.key, $event)"
          />
          <NInputNumber
            :value="modelValue[control.key]"
            :min="control.min"
            :max="control.max"
            :show-button="false"
            @update:value="emitFontSize(control.key, $event)"
          />
        </div>
      </NFormItem>
    </NForm>
  </div>
</template>
