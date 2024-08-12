<template>
  <main>
    <el-tree
      :data="treeData"
      node-key="id"
      :props="{label: 'name', children: 'children'}"
      :default-expand-all="false"
      :expand-on-click-node="true"
      :allow-drop="allowDrop"
      :allow-drag="allowDrag"
      :default-expanded-keys="expandedKeys"
      @node-drag-start="handleDragStart"
      @node-drag-enter="handleDragEnter"
      @node-drag-leave="handleDragLeave"
      @node-drag-over="handleDragOver"
      @node-drag-end="handleDragEnd"
      @node-drop="handleDrop"
      highlight-current
      draggable
    >
      <template #default="{ node, data }">
        <span class="custom-tree-node" @mouseover="handleNodeMouseHover(node, data)" @mouseout="handleNodeMouseOut(node, data)">
          <span v-show="!data.isEditing">{{ data.name }}</span>
          <!--编辑:新建/修改-->
          <span v-if="data.isEditing">
            <div style="display: flex; align-items: center;">
              <el-input ref="editingNode" v-model="data.newName" @blur="()=>{console.log('input blur: ', data)}" @click.stop="()=>{}"></el-input>
              <el-tooltip content="保存" placement="top" effect="light">
                <el-icon size="large" color="#67C23A" @click.stop="saveEdit(node, data)" style="margin-left: 2px;"><Check/></el-icon>
              </el-tooltip>
              <el-tooltip content="取消" placement="top" effect="light">
                <el-icon size="large" color="#909399" @click.stop="cancelEdit(node, data)" style="margin-left: 5px;"><RefreshLeft/></el-icon>
              </el-tooltip>
            </div>
          </span>
          <!--操作按钮-->
          <span v-show="data.opIconShow">
            <span v-show="!data.isEditing" >
              <el-icon size="large" color="#409efc" style="margin-left: 2px;" @click.stop="addFolder(node, data)"><FolderAdd/></el-icon>
              <el-icon size="large" color="#409efc" style="margin-left: 2px;" @click.stop="addFile(node, data)"><DocumentAdd/></el-icon>
              <el-icon size="large" color="#409efc" style="margin-left: 2px;" @click.stop="enterEdit(node, data)"><Edit/></el-icon>
              <el-popconfirm :visible="data.popconfirmShow" trigger="click" title="确认删除？" confirm-button-text="确定" cancel-button-text="取消"
                @confirm="deleteFolderOrFile(node, data)"
                @cancel="handlePopconfirmHide(node, data)"
              >
                <template #reference>
                  <el-icon size="large" color="#E6A23C" @click.stop="handlePopconfirmShow(node, data)"><Delete/></el-icon>
                </template>
              </el-popconfirm>
            </span>
          </span>
        </span>
      </template>
    </el-tree>

    <!--遮罩层-->
    <!-- <div v-show="popconfirmShow" class="custom-mask"></div> -->
  </main>
</template>

<script setup>
import { ref,reactive,nextTick,onMounted } from 'vue'
import { FolderAdd,Delete,DocumentAdd,Check,Edit,RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
// element组件颜色
// 成功（Success） | #67C23A 警告（Warning） | #E6A23C 危险（Danger） | #F56C6C 主要（Primary） | #409EFF 信息（Info） | #909399

const treeData = ref([]) // 触发组件重新渲染: treeData.value = [...treeData.value]
const expandedKeys = ref([])
let editingNode = ref(null)
const popconfirmShow = ref(false)

let userConfig = reactive({})

onMounted(async () => {
  console.log('mounted', new Date().toLocaleString())
  let res = await window.go.app.common.GetUserConfigData('user.config.json')
  if (res.code != 1) {
    ElMessage.error('读取配置文件失败:' + res.errMsg)
    return
  }
  Object.assign(userConfig, JSON.parse(res.data))
  if (userConfig.noteDir) {
    res = await window.go.app.common.GetUserNoteDirAsTreeData(userConfig.noteDir)
    if (res.code != 1) {
      ElMessage.error("读取笔记目录失败：" + res.errMsg)
      return
    }
    treeData.value = [res.data]
  }
})

// 节点操作图标控制
// 节点mouse hover
const handleNodeMouseHover = (node, data) => {
  // 气泡框为隐藏状态，显示其它node的操作按钮
  if (!popconfirmShow.value) {
    data.opIconShow = true
  }
}
// 节点mouse out
const handleNodeMouseOut = (node, data) => {
  // 节点气泡框为隐藏状态，隐藏当前node的操作按钮
  if (!data.popconfirmShow) {
    data.popconfirmShow = false
    data.opIconShow = false
  }
}
// 气泡框显示
const handlePopconfirmShow = (node, data) => {
  data.popconfirmShow = true
  popconfirmShow.value = true
}
// 气泡框隐藏
const handlePopconfirmHide = (node, data) => {
  data.popconfirmShow = false
  data.opIconShow = false
  popconfirmShow.value = false
}

// 节点新建/编辑/删除
// 添加文件夹
const addFolder = async (node, data) => {
  await handleNodeExpand(node, data)
  if (!data.children) {
    data.children = []
  }
  data.children.push({
    id: crypto.randomUUID(),
    name: 'new folder',
    newName: 'newfolder',
    opIconShow: false,
    type: 'folder',
    isEditing: true,
    isNew: true,
    children: []
  })
  nextTick(() => {
    // editingNode.value.focus()
    editingNode.value.$el.querySelector('input').select()
  })
}
// 添加文件
const addFile = async (node, data) => {
  await handleNodeExpand(node, data)
  if (!data.children) {
    data.children = []
  }
  data.children.push({
    id: crypto.randomUUID(),
    name: 'new note.md',
    newName: 'new note.md',
    opIconShow: false,
    type: 'file',
    isEditing: true,
    isNew: true,
    children: []
  })
  nextTick(() => {
    // editingNode.value.focus()
    editingNode.value.$el.querySelector('input').select()
  })
}
// 进入编辑
const enterEdit = (node, data) => {
  data.isEditing = true
  data.newName = data.name
  nextTick(() => {
    // editingNode.value.focus()
    editingNode.value.$el.querySelector('input').select()
  })
}
// 取消编辑
const cancelEdit = (node, data) => {
  if (data.isEditing && data.isNew) {
    // 如果是当前新建，从树中移除
    const parent = node.parent
    const children = parent.data.children || parent.data
    const index = children.findIndex((d) => d.id == data.id)
    children.splice(index, 1)
  } else if (data.isEditing && !data.isNew) {
    // 如果是编辑已存在的，取消编辑状态
    data.isEditing = false
  }
}
// 删除文件夹/文件
const deleteFolderOrFile = (node, data) => {
  const parent = node.parent
  const children = parent.data.children || parent.data
  const index = children.findIndex((d) => { d.id === data.id })
  children.splice(index, 1)
  treeData.value = [...treeData.value]
  // 操作完成，调用隐藏方法
  handlePopconfirmHide(node, data)
}
// 保存编辑
const saveEdit = async (node, data) => {
  if (data.name.trim() !== '') {
    data.name = data.name.trim()
  } else {
    ElMessage.warning('名称不能为空')
    editingNode.value.$el.querySelector('input').select()
    return
  }
  // 保存文件夹
  if (data.type == 'folder') {
    const oldName = data.isNew ? '' : data.name;
    const res = await window.go.app.common.CreateOrRenameFolder(oldName, data.newName, node.parent.data.path)
    if (res.code != 1) {
      ElMessage.error(res.errMsg)
      inputFocus()
      return
    }
  }
  // 保存文件
  else if (data.type == 'file') {
    const oldName = data.isNew ? '' : data.name;
    const res = await window.go.app.common.CreateOrRenameFile(oldName, data.newName, node.parent.data.path)
    if (res.code != 1) {
      ElMessage.error(res.errMsg)
      inputFocus()
      return
    }
  }
  data.isEditing = false
  data.name = data.newName
}
// 节点展开/折叠
const handleNodeExpand = async (node, data) => {
  if (!node.expanded && data.type == 'folder') {
    node.expanded = true
  }
}
// input框设置焦点
const inputFocus = () => {
  editingNode.value.focus()
}
// input框全选
const inputSelect = () => {
  editingNode.value.$el.querySelector('input').select()
}

// 事件处理函数
const handleDragStart = (node, ev) => {
  console.log('drag start', node)
}
const handleDragEnter = (draggingNode, dropNode, ev) => {
  console.log('tree drag enter:', dropNode.name)
}
const handleDragLeave = (draggingNode, dropNode, ev) => {
  console.log('tree drag leave:', dropNode.name)
}
const handleDragOver = (draggingNode, dropNode, ev) => {
  console.log('tree drag over:', dropNode.name)
}
const handleDragEnd = (draggingNode, dropNode, dropType, ev) => {
  console.log('tree drag end:', dropNode && dropNode.name, dropType)
}
const handleDrop = (draggingNode, dropNode, dropType, ev) => {
  console.log('tree drop:', dropNode.name, dropType)
}
// 允许放置
const allowDrop = (draggingNode, dropNode, type) => {
  if (dropNode.data.name === 'Level two 3-1') {
    return type !== 'inner'
  } else {
    return true
  }
}
// 允许拖动
const allowDrag = (draggingNode) => {
  return !draggingNode.data.name.includes('Level three 3-1-1')
}

</script>

<style scoped >
.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding-right: 8px;
}

.custom-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}
</style>