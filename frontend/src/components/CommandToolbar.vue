<script setup lang="ts">
import {
  ListTree,
  SquarePen,
  Moon,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Search,
  Settings,
  Sun,
} from '@lucide/vue'
import { NButton, NTooltip } from 'naive-ui'
import { computed } from 'vue'
import type { ThemeMode } from '../lib/theme'
import type { SaveState, UtilityPanel } from '../types/app'

const props = defineProps<{
  activePanel: UtilityPanel
  drawerOpen: boolean
  sidebarOpen: boolean
  searchOpen: boolean
  theme: ThemeMode
  saveState: SaveState
  workspaceName: string
  activeDocumentName: string
  openDocumentCount: number
}>()

const emit = defineEmits<{
  (event: 'select', panel: UtilityPanel): void
  (event: 'search'): void
  (event: 'save'): void
  (event: 'create-note'): void
  (event: 'toggle-sidebar'): void
  (event: 'toggle-theme'): void
}>()

const saveStateText = computed(() => {
  if (props.saveState === 'saving') return '保存中'
  if (props.saveState === 'dirty') return '未保存'
  if (props.saveState === 'error') return '保存失败'
  return '已保存'
})

function panelType(panel: UtilityPanel) {
  return panelActive(panel) ? 'primary' : 'default'
}

function panelActive(panel: UtilityPanel) {
  return props.drawerOpen && props.activePanel === panel
}
</script>

<template>
  <header data-test="command-toolbar" class="command-toolbar">
    <div class="command-brand">
      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button command-button--ghost"
            size="small"
            quaternary
            data-test="toggle-sidebar"
            :aria-label="sidebarOpen ? '隐藏目录栏' : '显示目录栏'"
            :title="sidebarOpen ? '隐藏目录栏' : '显示目录栏'"
            @click="emit('toggle-sidebar')"
          >
            <PanelLeftClose v-if="sidebarOpen" :size="15" />
            <PanelLeftOpen v-else :size="15" />
          </NButton>
        </template>
        {{ sidebarOpen ? '隐藏目录栏' : '显示目录栏' }}
      </NTooltip>

      <span data-test="brand-mark" class="brand-mark" aria-hidden="true">D</span>
      <span class="command-brand__copy">
        <strong class="command-brand__name">Donote</strong>
        <span data-test="command-workspace-name" class="command-brand__meta">
          {{ workspaceName || '本地 Markdown 笔记' }}
        </span>
      </span>
    </div>

    <div class="command-context">
      <NotebookPen :size="15" aria-hidden="true" />
      <span data-test="command-active-document" class="command-context__title">
        {{ activeDocumentName || '选择笔记开始写作' }}
      </span>
      <span
        data-test="command-open-count"
        class="command-count"
        :aria-label="`打开文档数 ${openDocumentCount}`"
      >
        {{ openDocumentCount }}
      </span>
      <span
        v-if="activeDocumentName"
        class="command-status"
        :class="`command-status--${saveState}`"
        role="status"
        aria-live="polite"
      >
        {{ saveStateText }}
      </span>
    </div>

    <div class="command-actions">
      <NTooltip placement="bottom">
        <template #trigger>
          <NButton class="command-button" quaternary data-test="create-note" aria-label="新建笔记" title="新建笔记" @click="emit('create-note')">
            <SquarePen :size="16" />
          </NButton>
        </template>
        新建笔记
      </NTooltip>
      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            :class="{ 'command-button--active': searchOpen }"
            size="small"
            quaternary
            data-test="utility-search"
            aria-label="搜索"
            title="搜索笔记内容 (Ctrl+F)"
            :type="searchOpen ? 'primary' : 'default'"
            :aria-pressed="searchOpen"
            @click="emit('search')"
          >
            <Search :size="15" />
          </NButton>
        </template>
        搜索
      </NTooltip>

      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            size="small"
            quaternary
            data-test="save-now"
            aria-label="立即保存"
            title="立即保存 (Ctrl+S)"
            :loading="saveState === 'saving'"
            :disabled="!activeDocumentName || saveState === 'saving'"
            @click="emit('save')"
          >
            <Save :size="15" />
          </NButton>
        </template>
        立即保存
      </NTooltip>

      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            :class="{ 'command-button--active': panelActive('outline') }"
            size="small"
            quaternary
            data-test="utility-outline"
            aria-label="大纲"
            title="大纲"
            :type="panelType('outline')"
            :aria-pressed="panelActive('outline')"
            @click="emit('select', 'outline')"
          >
            <ListTree :size="15" />
          </NButton>
        </template>
        大纲
      </NTooltip>

      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            :class="{ 'command-button--active': panelActive('settings') }"
            size="small"
            quaternary
            data-test="utility-settings"
            aria-label="设置"
            title="设置"
            :type="panelType('settings')"
            :aria-pressed="panelActive('settings')"
            @click="emit('select', 'settings')"
          >
            <Settings :size="15" />
          </NButton>
        </template>
        设置
      </NTooltip>

      <NTooltip placement="bottom">
        <template #trigger>
          <NButton
            class="command-button"
            size="small"
            quaternary
            data-test="theme-toggle"
            :aria-label="theme === 'dark' ? '切换浅色' : '切换深色'"
            :title="theme === 'dark' ? '切换浅色' : '切换深色'"
            @click="emit('toggle-theme')"
          >
            <Sun v-if="theme === 'dark'" :size="15" />
            <Moon v-else :size="15" />
          </NButton>
        </template>
        {{ theme === 'dark' ? '切换浅色' : '切换深色' }}
      </NTooltip>
    </div>
  </header>
</template>
