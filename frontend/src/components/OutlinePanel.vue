<script setup lang="ts">
import { ElEmpty, ElScrollbar } from 'element-plus'
import type { OutlineItem } from '../lib/outline'

defineProps<{
  items: OutlineItem[]
}>()
</script>

<template>
  <ElScrollbar class="utility-panel-scroll">
    <div class="utility-panel">
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
      <ElEmpty v-else description="当前笔记没有标题" :image-size="56" />
    </div>
  </ElScrollbar>
</template>
