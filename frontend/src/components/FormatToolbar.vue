<script setup lang="ts">
import { Bold, Code, Heading1, Italic, List, Quote, Table2 } from '@lucide/vue'
import { ElButton, ElButtonGroup, ElTooltip } from 'element-plus'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

withDefaults(
  defineProps<{
    tooltipPlacement?: TooltipPlacement
  }>(),
  {
    tooltipPlacement: 'right',
  },
)

defineEmits<{
  (event: 'insert-markdown', markdown: string): void
}>()

const formatActions = [
  { key: 'heading', title: '标题', markdown: '# 标题', icon: Heading1 },
  { key: 'bold', title: '加粗', markdown: '**加粗文本**', icon: Bold },
  { key: 'italic', title: '斜体', markdown: '*斜体文本*', icon: Italic },
  { key: 'list', title: '列表', markdown: '- 列表项', icon: List },
  { key: 'quote', title: '引用', markdown: '> 引用', icon: Quote },
  { key: 'code', title: '代码', markdown: '`代码`', icon: Code },
  {
    key: 'table',
    title: '表格',
    markdown: '| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |',
    icon: Table2,
  },
]
</script>

<template>
  <ElButtonGroup data-test="format-toolbar" class="toolbar-group control-cluster format-toolbar format-toolbar--vertical">
    <ElTooltip
      v-for="action in formatActions"
      :key="action.key"
      :content="action.title"
      :placement="tooltipPlacement"
    >
      <ElButton class="tool-button" :data-test="`format-${action.key}`" @click="$emit('insert-markdown', action.markdown)">
        <component :is="action.icon" :size="17" />
      </ElButton>
    </ElTooltip>
  </ElButtonGroup>
</template>
