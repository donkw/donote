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
  PanelRightClose,
  PanelRightOpen,
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
  showOutline: boolean
  theme: ThemeMode
  saveStatusText: string
  saveState: SaveState
}>()

defineEmits<{
  (event: 'toggle-sidebar'): void
  (event: 'insert-markdown', markdown: string): void
  (event: 'search'): void
  (event: 'settings'): void
  (event: 'toggle-outline'): void
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
  <header data-test="topbar" class="topbar app-chrome app-header">
    <div class="brand app-header__brand">
      <ElTooltip :content="showSidebar ? '隐藏文件树' : '显示文件树'" placement="bottom">
        <ElButton class="icon-button subtle" data-test="sidebar-toggle" circle text @click="$emit('toggle-sidebar')">
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

    <ElButtonGroup data-test="format-toolbar" class="toolbar-group control-cluster format-toolbar">
      <ElTooltip
        v-for="action in formatActions"
        :key="action.key"
        :content="action.title"
        placement="bottom"
      >
        <ElButton class="tool-button" :data-test="`format-${action.key}`" @click="$emit('insert-markdown', action.markdown)">
          <component :is="action.icon" :size="17" />
        </ElButton>
      </ElTooltip>
    </ElButtonGroup>

    <div class="toolbar-spacer app-header__spacer" />

    <div data-test="window-actions" class="toolbar-group control-cluster window-actions">
      <ElTag
        v-if="saveStatusText"
        class="save-status status-pill"
        :data-state="saveState"
        :type="saveState === 'error' ? 'danger' : saveState === 'dirty' ? 'warning' : 'info'"
      >
        {{ saveStatusText }}
      </ElTag>

      <ElTooltip content="当前文档搜索" placement="bottom">
        <ElButton class="icon-button" data-test="search-toggle" circle @click="$emit('search')">
          <Search :size="18" />
        </ElButton>
      </ElTooltip>
      <ElTooltip content="立即保存" placement="bottom">
        <ElButton class="icon-button" data-test="save-now" circle @click="$emit('save')">
          <FileText :size="18" />
        </ElButton>
      </ElTooltip>
      <ElTooltip content="设置" placement="bottom">
        <ElButton class="icon-button" data-test="settings-toggle" circle @click="$emit('settings')">
          <Settings :size="18" />
        </ElButton>
      </ElTooltip>
      <ElTooltip :content="showOutline ? '隐藏大纲' : '显示大纲'" placement="bottom">
        <ElButton class="icon-button" data-test="outline-toggle" circle @click="$emit('toggle-outline')">
          <PanelRightClose v-if="showOutline" :size="18" />
          <PanelRightOpen v-else :size="18" />
        </ElButton>
      </ElTooltip>
      <ElTooltip :content="theme === 'dark' ? '切换浅色' : '切换深色'" placement="bottom">
        <ElButton class="icon-button" data-test="theme-toggle" circle @click="$emit('toggle-theme')">
          <Sun v-if="theme === 'dark'" :size="18" />
          <Moon v-else :size="18" />
        </ElButton>
      </ElTooltip>
    </div>
  </header>
</template>
