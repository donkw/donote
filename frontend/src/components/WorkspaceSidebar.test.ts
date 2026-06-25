import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'
import { main } from '../../wailsjs/go/models'
import WorkspaceSidebar from './WorkspaceSidebar.vue'

const tree: main.FileNode[] = [
  main.FileNode.createFrom({
    name: 'projects',
    path: 'projects',
    type: 'folder',
    children: [
      {
        name: 'archive',
        path: 'projects/archive',
        type: 'folder',
        children: [{ name: 'plan.md', path: 'projects/archive/plan.md', type: 'file' }],
      },
    ],
  }),
]

describe('WorkspaceSidebar', () => {
  test('renders workspace as the tree root with search and indented children', () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: 'projects/archive/plan.md',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    expect(wrapper.text()).toContain('notes')
    expect(wrapper.find('.workspace-title').exists()).toBe(false)
    expect(wrapper.find('[data-test="open-workspace"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="new-note"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="new-folder"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElTree' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElInput' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElEmpty' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElScrollbar' }).exists()).toBe(false)
    expect(wrapper.find('.el-tree').exists()).toBe(false)
    expect(wrapper.find('.el-input').exists()).toBe(false)
    expect(wrapper.find('.el-empty').exists()).toBe(false)
    expect(wrapper.get('[data-test="file-tree-search"] input').attributes('placeholder')).toBe(
      '搜索文件',
    )
    expect(wrapper.get('[data-test="file-tree-search"] input').attributes('aria-label')).toBe(
      '搜索文件',
    )
    expect(wrapper.get('[data-test="workspace-root"]').text()).toContain('notes')
    expect(wrapper.get('[data-test="workspace-root"]').attributes('style')).toContain(
      '--tree-depth: 0',
    )
    expect(wrapper.text()).toContain('projects')
    expect(wrapper.text()).toContain('plan.md')
    expect(wrapper.get('[data-test="folder-projects"]').classes()).toContain('folder')
    expect(wrapper.get('[data-test="folder-projects"]').attributes('style')).toContain(
      '--tree-depth: 1',
    )
    expect(wrapper.get('[data-test="folder-projects/archive"]').attributes('style')).toContain(
      '--tree-depth: 2',
    )
    expect(wrapper.get('[data-test="file-projects/archive/plan.md"]').classes()).toContain(
      'active',
    )
    expect(wrapper.get('[data-test="file-projects/archive/plan.md"]').attributes('style')).toContain(
      '--tree-depth: 3',
    )

    const rootRow = wrapper.get('[data-test="workspace-root"]')
    expect(rootRow.attributes('aria-label')).toBe('折叠工作区 notes')
    expect(rootRow.attributes('aria-expanded')).toBe('true')
    expect(rootRow.find('.file-tree-node__icon--workspace').exists()).toBe(true)
    expect(rootRow.find('.lucide-notebook-tabs').exists()).toBe(true)

    const folderRow = wrapper.get('[data-test="folder-projects"]')
    expect(folderRow.attributes('aria-label')).toBe('折叠文件夹 projects')
    expect(folderRow.attributes('aria-expanded')).toBe('true')
    expect(folderRow.find('.file-tree-node__chevron').exists()).toBe(true)
    expect(folderRow.find('.file-tree-node__icon--folder').exists()).toBe(true)
    expect(folderRow.find('.lucide-folder-open').exists()).toBe(true)

    const fileRow = wrapper.get('[data-test="file-projects/archive/plan.md"]')
    expect(fileRow.attributes('aria-label')).toBe('打开文件 plan.md')
    expect(fileRow.attributes('aria-current')).toBe('page')
    expect(fileRow.attributes('title')).toBe('projects/archive/plan.md')
    expect(fileRow.find('.file-tree-node__chevron--spacer').exists()).toBe(true)
    expect(fileRow.find('.file-tree-node__icon--file').exists()).toBe(true)
    expect(fileRow.find('.lucide-file-pen-line').exists()).toBe(true)
    expect(fileRow.find('.file-tree-node__label').text()).toBe('plan.md')
  })

  test('emits select-file with the file path', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    await wrapper.get('[data-test="file-projects/archive/plan.md"]').trigger('click')

    expect(wrapper.emitted('select-file')).toEqual([['projects/archive/plan.md']])
  })

  test('opens file context menu and emits rename and delete actions', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    await wrapper
      .get('[data-test="file-projects/archive/plan.md"]')
      .trigger('contextmenu', { clientX: 48, clientY: 72 })

    const menu = wrapper.get('[data-test="file-tree-context-menu"]')
    expect(menu.text()).toContain('重命名')
    expect(menu.text()).toContain('删除')
    expect(menu.text()).not.toContain('新建子目录')
    expect(menu.text()).not.toContain('新建 md')

    await wrapper.get('[data-test="context-rename"]').trigger('click')
    expect(wrapper.emitted('rename-node')).toEqual([['projects/archive/plan.md']])

    await wrapper
      .get('[data-test="file-projects/archive/plan.md"]')
      .trigger('contextmenu', { clientX: 48, clientY: 72 })
    await wrapper.get('[data-test="context-delete"]').trigger('click')

    expect(wrapper.emitted('delete-node')).toEqual([['projects/archive/plan.md']])
  })

  test('opens folder context menu and emits creation and rename actions', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    await wrapper.get('[data-test="folder-projects"]').trigger('contextmenu', {
      clientX: 32,
      clientY: 64,
    })

    const menu = wrapper.get('[data-test="file-tree-context-menu"]')
    expect(menu.text()).toContain('新建子目录')
    expect(menu.text()).toContain('新建 md')
    expect(menu.text()).toContain('重命名')
    expect(menu.text()).not.toContain('删除')

    await wrapper.get('[data-test="context-create-folder"]').trigger('click')
    expect(wrapper.emitted('create-folder')).toEqual([['projects']])

    await wrapper.get('[data-test="folder-projects"]').trigger('contextmenu', {
      clientX: 32,
      clientY: 64,
    })
    await wrapper.get('[data-test="context-create-markdown"]').trigger('click')
    expect(wrapper.emitted('create-markdown')).toEqual([['projects']])

    await wrapper.get('[data-test="folder-projects"]').trigger('contextmenu', {
      clientX: 32,
      clientY: 64,
    })
    await wrapper.get('[data-test="context-rename"]').trigger('click')
    expect(wrapper.emitted('rename-node')).toEqual([['projects']])
  })

  test('uses the workspace root context menu for root-level creation only', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    await wrapper.get('[data-test="workspace-root"]').trigger('contextmenu', {
      clientX: 16,
      clientY: 32,
    })

    const menu = wrapper.get('[data-test="file-tree-context-menu"]')
    expect(menu.text()).toContain('新建子目录')
    expect(menu.text()).toContain('新建 md')
    expect(menu.text()).not.toContain('重命名')
    expect(menu.text()).not.toContain('删除')

    await wrapper.get('[data-test="context-create-markdown"]').trigger('click')
    expect(wrapper.emitted('create-markdown')).toEqual([['']])
  })

  test('positions the context menu with viewport coordinates so it can cover the editor pane', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })
    vi.spyOn(wrapper.get('.workspace-sidebar').element, 'getBoundingClientRect').mockReturnValue({
      x: 240,
      y: 16,
      left: 240,
      top: 16,
      right: 520,
      bottom: 720,
      width: 280,
      height: 704,
      toJSON: () => ({}),
    })

    await wrapper.get('[data-test="folder-projects"]').trigger('contextmenu', {
      clientX: 552,
      clientY: 88,
    })

    const menu = wrapper.get('[data-test="file-tree-context-menu"]')
    expect(menu.attributes('style')).toContain('left: 552px')
    expect(menu.attributes('style')).toContain('top: 88px')
  })

  test('clicking a folder emits exactly one collapse intent', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    const folderRow = wrapper.get('[data-test="folder-projects"]')

    expect(folderRow.classes()).toContain('tree-row')
    expect(folderRow.attributes('aria-expanded')).toBe('true')
    await folderRow.trigger('click')

    expect(wrapper.emitted('folder-collapsed')).toEqual([['projects']])
    expect(wrapper.emitted('folder-expanded')).toBeUndefined()
  })

  test('clicking a folder emits exactly one expand intent', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: [],
      },
    })

    const folderRow = wrapper.get('[data-test="folder-projects"]')
    expect(folderRow.attributes('aria-expanded')).toBe('false')
    await folderRow.trigger('click')

    expect(wrapper.emitted('folder-expanded')).toEqual([['projects']])
    expect(wrapper.emitted('folder-collapsed')).toBeUndefined()
  })

  test('clicking the workspace root collapses locally without persisting a folder path', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    const rootRow = wrapper.get('[data-test="workspace-root"]')
    expect(rootRow.attributes('aria-expanded')).toBe('true')

    await rootRow.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="workspace-root"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="folder-projects"]').exists()).toBe(false)

    await wrapper.get('[data-test="workspace-root"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="workspace-root"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-test="folder-projects"]').exists()).toBe(true)
    expect(wrapper.emitted('folder-collapsed')).toBeUndefined()
    expect(wrapper.emitted('folder-expanded')).toBeUndefined()
  })

  test('filters tree nodes in the DOM from the sidebar search', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    await wrapper.get('[data-test="file-tree-search"] input').setValue('plan')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="workspace-root"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="folder-projects"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="folder-projects/archive"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(true)

    await wrapper.get('[data-test="file-tree-search"] input').setValue('missing')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(false)
  })

  test('reveals matching descendants when filtering collapsed folders', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: [],
      },
    })

    expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(false)

    await wrapper.get('[data-test="file-tree-search"] input').setValue('plan')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="folder-projects"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-test="folder-projects/archive"]').attributes('aria-expanded')).toBe(
      'true',
    )
    expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(true)

    await wrapper.get('[data-test="file-tree-search"] input').setValue('')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="folder-projects"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="file-projects/archive/plan.md"]').exists()).toBe(false)
  })

  test('renders the empty workspace state without Element Plus chrome', () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: '',
        tree: [],
        activeFilePath: '',
        expandedFolderPaths: [],
      },
    })

    expect(wrapper.text()).toContain('还没有打开笔记文件夹')
    expect(wrapper.find('[data-test="file-tree-search"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElTree' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElInput' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElEmpty' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElScrollbar' }).exists()).toBe(false)
    expect(wrapper.find('.el-tree').exists()).toBe(false)
    expect(wrapper.find('.el-input').exists()).toBe(false)
    expect(wrapper.find('.el-empty').exists()).toBe(false)
  })
})
