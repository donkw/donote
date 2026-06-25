<script setup lang="ts">
import { NEmpty, NScrollbar } from 'naive-ui'
import type { OutlineItem } from '../lib/outline'

defineProps<{
  items: OutlineItem[]
  fontSize: number
}>()
</script>

<template>
  <NScrollbar class="utility-panel-scroll">
    <div class="utility-panel outline-panel-content" :style="{ '--outline-font-size': `${fontSize}px` }">
      <h2>大纲</h2>
      <div v-if="items.length" class="outline-list">
        <button
          v-for="item in items"
          :key="item.id"
          class="outline-row"
          type="button"
          :style="{ paddingLeft: `${8 + (item.level - 1) * 14}px` }"
        >
          {{ item.text }}
        </button>
      </div>
      <NEmpty v-else description="当前笔记没有标题" :image-size="56" />
    </div>
  </NScrollbar>
</template>
