<script setup lang="ts">
import {
  Bold,
  Code,
  FileText,
  Heading1,
  Italic,
  List,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Quote,
  Search,
  Settings,
  Sun,
} from '@lucide/vue'
import { ElButton, ElButtonGroup, ElTag, ElTooltip } from 'element-plus'
import type { SaveState, UtilityPanel } from '../types/app'
import type { ThemeMode } from '../lib/theme'

defineProps<{
  showSidebar: boolean
  theme: ThemeMode
  saveStatusText: string
  saveState: SaveState
}>()

defineEmits<{
  (event: 'toggle-sidebar'): void
  (event: 'insert-markdown', markdown: string): void
  (event: 'save'): void
  (event: 'toggle-theme'): void
  (event: 'open-utility', panel: UtilityPanel): void
}>()

const formatActions = [
  { key: 'heading', title: '标题', markdown: '# 标题', icon: Heading1 },
  { key: 'bold', title: '加粗', markdown: '**加粗文本**', icon: Bold },
  { key: 'italic', title: '斜体', markdown: '*斜体文本*', icon: Italic },
  { key: 'list', title: '列表', markdown: '- 列表项', icon: List },
  { key: 'quote', title: '引用', markdown: '> 引用', icon: Quote },
  { key: 'code', title: '代码', markdown: '`代码`', icon: Code },
]
</script>

<template>
  <header data-test="topbar" class="app-header">
    <div class="app-header__brand">
      <ElTooltip :content="showSidebar ? '隐藏文件树' : '显示文件树'" placement="bottom">
        <ElButton data-test="sidebar-toggle" circle text @click="$emit('toggle-sidebar')">
          <PanelLeftClose v-if="showSidebar" :size="18" />
          <PanelLeftOpen v-else :size="18" />
        </ElButton>
      </ElTooltip>
      <span data-test="brand-mark" class="brand-mark">D</span>
      <span class="brand-copy">
        <span class="brand-name">Donote</span>
        <span class="brand-subtitle">Markdown Notes</span>
      </span>
    </div>

    <ElButtonGroup data-test="format-toolbar" class="format-toolbar">
      <ElTooltip
        v-for="action in formatActions"
        :key="action.key"
        :content="action.title"
        placement="bottom"
      >
        <ElButton :data-test="`format-${action.key}`" @click="$emit('insert-markdown', action.markdown)">
          <component :is="action.icon" :size="17" />
        </ElButton>
      </ElTooltip>
    </ElButtonGroup>

    <div class="app-header__spacer" />

    <ElTag
      v-if="saveStatusText"
      class="save-status"
      :type="saveState === 'error' ? 'danger' : saveState === 'dirty' ? 'warning' : 'info'"
    >
      {{ saveStatusText }}
    </ElTag>

    <ElTooltip content="当前文档搜索" placement="bottom">
      <ElButton circle @click="$emit('open-utility', 'search')">
        <Search :size="18" />
      </ElButton>
    </ElTooltip>
    <ElTooltip content="立即保存" placement="bottom">
      <ElButton data-test="save-now" circle @click="$emit('save')">
        <FileText :size="18" />
      </ElButton>
    </ElTooltip>
    <ElTooltip content="设置" placement="bottom">
      <ElButton circle @click="$emit('open-utility', 'settings')">
        <Settings :size="18" />
      </ElButton>
    </ElTooltip>
    <ElTooltip :content="theme === 'dark' ? '切换浅色' : '切换深色'" placement="bottom">
      <ElButton data-test="theme-toggle" circle @click="$emit('toggle-theme')">
        <Sun v-if="theme === 'dark'" :size="18" />
        <Moon v-else :size="18" />
      </ElButton>
    </ElTooltip>
  </header>
</template>
