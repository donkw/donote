<template>
  <main>
    <el-form :inline="true" :model="config">
      <el-form-item label="笔记目录">
        <el-input type="text" v-model="config.noteDir" disabled style="width: 200px;">
          <template #append>
            <el-button :icon="FolderOpened" @click="openDirectoryDialog('noteDir')"/>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="文件目录">
        <el-input type="text" v-model="config.fileDir" disabled style="width: 200px;">
          <template #append>
            <el-button :icon="FolderOpened" @click="openDirectoryDialog('fileDir')"/>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
  </main>
</template>

<script setup>
import { ref,reactive,onMounted, watch, computed } from 'vue'
import { Folder,FolderOpened,FolderAdd,Delete,DocumentAdd,Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const configFilePath = 'user.config.json'
let config = reactive({})
let configVersion = ref(0)

onMounted(async () => {
  // 读取用户配置
  const res = await window.go.app.common.GetUserConfigData(configFilePath)
  if (res.code != 1) {
    ElMessage.error('读取配置文件失败，' + res.errMsg)
    return
  }
  Object.assign(config, JSON.parse(res.data))
})

watch(config, async (newVal, oldVal) => {
  await saveUserConfig()
})

// 打开选择目录对话狂
const openDirectoryDialog = async (cmp) => {
  const res = await window.go.app.common.OpenDirectoryDialog()
  if (res.code != 1) {
    ElMessage.error('打开目录选择对话框失败，' + res.errMsg)
  }
  if (res.data) {
    if (cmp == 'noteDir') {
      config.noteDir = res.data
    } else if (cmp == 'fileDir') {
      config.fileDir = res.data
    }
  }
}
// 保存配置
const saveUserConfig = async () => {
  const res = await window.go.app.common.SaveUserConfigData(configFilePath, JSON.stringify(config))
  if (res.code != 1) {
    ElMessage.error('更改失败，' + res.errMsg)
  }
  configVersion.value += 1
  if (configVersion.value > 1) {
    ElMessage.success('更改生效')
  }
}
</script>
