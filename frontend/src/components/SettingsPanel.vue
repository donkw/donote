<script setup lang="ts">
import { ElButton, ElForm, ElFormItem, ElInput, ElSlider } from 'element-plus'
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

defineEmits<{
  (event: 'update-font-size', area: LayoutFontSizeArea, value: number): void
  (event: 'update-editor-width', value: number): void
  (event: 'update-attachment-directory', key: keyof AttachmentDirectories, value: string): void
  (event: 'select-attachment-directory', key: keyof AttachmentDirectories): void
  (event: 'select-workspace'): void
  (event: 'cancel'): void
  (event: 'save'): void
}>()
</script>

<template>
  <div class="utility-panel settings-panel">
    <h2>设置</h2>
    <p class="panel-subtitle">工作目录</p>
    <ElForm label-position="top">
      <ElFormItem label="当前工作目录">
        <ElInput
          data-test="settings-workspace-root"
          :model-value="workspaceRoot"
          placeholder="未选择工作目录"
          readonly
        >
          <template #append>
            <ElButton
              data-test="select-workspace-root"
              @click="$emit('select-workspace')"
            >
              选择
            </ElButton>
          </template>
        </ElInput>
      </ElFormItem>
    </ElForm>

    <p class="panel-subtitle">编辑器布局</p>
    <ElForm label-position="top">
      <ElFormItem :label="editorWidthControl.label">
        <ElSlider
          data-test="editor-width"
          :model-value="editorWidth"
          :min="editorWidthControl.min"
          :max="editorWidthControl.max"
          :step="editorWidthControl.step"
          show-input
          @update:model-value="$emit('update-editor-width', Number($event))"
        />
      </ElFormItem>
    </ElForm>

    <p class="panel-subtitle">附件存储目录</p>
    <ElForm label-position="top">
      <ElFormItem label="图片目录">
        <ElInput
          data-test="attachment-image-dir"
          :model-value="attachmentDirectories.images"
          placeholder="例如 assets/images"
          @update:model-value="$emit('update-attachment-directory', 'images', $event)"
        >
          <template #append>
            <ElButton
              data-test="select-attachment-image-dir"
              @click="$emit('select-attachment-directory', 'images')"
            >
              选择
            </ElButton>
          </template>
        </ElInput>
      </ElFormItem>
      <ElFormItem label="文件目录">
        <ElInput
          data-test="attachment-file-dir"
          :model-value="attachmentDirectories.files"
          placeholder="例如 assets/files"
          @update:model-value="$emit('update-attachment-directory', 'files', $event)"
        >
          <template #append>
            <ElButton
              data-test="select-attachment-file-dir"
              @click="$emit('select-attachment-directory', 'files')"
            >
              选择
            </ElButton>
          </template>
        </ElInput>
      </ElFormItem>
    </ElForm>

    <p class="panel-subtitle">布局字体大小</p>
    <ElForm label-position="top">
      <ElFormItem v-for="control in layoutFontSizeControls" :key="control.key" :label="control.label">
        <ElSlider
          :data-test="`font-size-${control.key}`"
          :model-value="modelValue[control.key]"
          :min="control.min"
          :max="control.max"
          show-input
          @update:model-value="$emit('update-font-size', control.key, Number($event))"
        />
      </ElFormItem>
    </ElForm>
    <div class="settings-actions">
      <ElButton @click="$emit('cancel')">取消</ElButton>
      <ElButton data-test="settings-save" type="primary" @click="$emit('save')">保存</ElButton>
    </div>
  </div>
</template>
