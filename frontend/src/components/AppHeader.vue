<script setup lang="ts">
import {
  FileText,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
} from '@lucide/vue'
import { ElButton, ElTag, ElTooltip } from 'element-plus'
import type { SaveState } from '../types/app'
import type { ThemeMode } from '../lib/theme'

defineProps<{
  showSidebar: boolean
  theme: ThemeMode
  saveStatusText: string
  saveState: SaveState
}>()

defineEmits<{
  (event: 'toggle-sidebar'): void
  (event: 'search'): void
  (event: 'settings'): void
  (event: 'save'): void
  (event: 'toggle-theme'): void
}>()
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
      <ElTooltip :content="theme === 'dark' ? '切换浅色' : '切换深色'" placement="bottom">
        <ElButton class="icon-button" data-test="theme-toggle" circle @click="$emit('toggle-theme')">
          <Sun v-if="theme === 'dark'" :size="18" />
          <Moon v-else :size="18" />
        </ElButton>
      </ElTooltip>
    </div>
  </header>
</template>
