<template>
  <div class="layout">
    <el-container>
      <el-aside width="25%" height="100%">
        <div>
          <DirectoryTree/>
        </div>
      </el-aside>
      <el-main style="padding: 0px;" height="100%">
        <MarkdownEditor/>
      </el-main>
    </el-container>

    <div>
      <el-dialog v-model="settingPageVisible" title="设置" width="80%" :close-on-click-modal="false">
        <UserConfig/>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import DirectoryTree from './components/DirectoryTree.vue'
import MarkdownEditor from './components/MarkdownEditor.vue'
import UserConfig from './components/UserConfig.vue'

import { ref,onMounted } from 'vue'

const settingPageVisible = ref(false)

onMounted(async()=>{
  // 打开设置页面
  window.runtime.EventsOn('openSettings', () => {
    settingPageVisible.value = true
  })
})

</script>

<style>
</style>
