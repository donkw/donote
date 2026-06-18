<script setup lang="ts">
import { ElButton, ElForm, ElFormItem, ElSlider } from 'element-plus'
import { editorWidthControl } from '../lib/editorWidth'
import {
  layoutFontSizeControls,
  type LayoutFontSizeArea,
  type LayoutFontSizes,
} from '../lib/layoutFontSizes'

defineProps<{
  modelValue: LayoutFontSizes
  editorWidth: number
}>()

defineEmits<{
  (event: 'update-font-size', area: LayoutFontSizeArea, value: number): void
  (event: 'update-editor-width', value: number): void
  (event: 'cancel'): void
  (event: 'save'): void
}>()
</script>

<template>
  <div class="utility-panel settings-panel">
    <h2>设置</h2>
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
