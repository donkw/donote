import { mount } from '@vue/test-utils'
import { ElTree } from 'element-plus'
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
    expect(wrapper.get('[data-test="file-tree-search"] input').attributes('placeholder')).toBe(
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
    const collapse = vi.fn()
    const expand = vi.fn()
    const getNode = vi.spyOn(wrapper.getComponent(ElTree).vm, 'getNode').mockReturnValue({
      expanded: true,
      collapse,
      expand,
    })

    expect(folderRow.classes()).toContain('tree-row')
    await folderRow.trigger('click')

    expect(getNode).toHaveBeenCalledWith('projects')
    expect(collapse).toHaveBeenCalledTimes(1)
    expect(expand).not.toHaveBeenCalled()
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

    const collapse = vi.fn()
    const expand = vi.fn()
    const getNode = vi.spyOn(wrapper.getComponent(ElTree).vm, 'getNode').mockReturnValue({
      expanded: false,
      collapse,
      expand,
    })

    await wrapper.get('[data-test="folder-projects"]').trigger('click')

    expect(getNode).toHaveBeenCalledWith('projects')
    expect(expand).toHaveBeenCalledTimes(1)
    expect(collapse).not.toHaveBeenCalled()
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

    const collapse = vi.fn()
    const expand = vi.fn()
    const getNode = vi.spyOn(wrapper.getComponent(ElTree).vm, 'getNode').mockReturnValue({
      expanded: true,
      collapse,
      expand,
    })

    await wrapper.get('[data-test="workspace-root"]').trigger('click')

    expect(getNode).toHaveBeenCalledWith('__donote_workspace_root__')
    expect(collapse).toHaveBeenCalledTimes(1)
    expect(expand).not.toHaveBeenCalled()
    expect(wrapper.emitted('folder-collapsed')).toBeUndefined()
    expect(wrapper.emitted('folder-expanded')).toBeUndefined()
  })

  test('filters tree nodes from the sidebar search', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects', 'projects/archive'],
      },
    })

    const filter = vi.spyOn(wrapper.getComponent(ElTree).vm, 'filter')
    await wrapper.get('[data-test="file-tree-search"] input').setValue('plan')

    expect(filter).toHaveBeenLastCalledWith('plan')

    const filterNodeMethod = wrapper.getComponent(ElTree).props(
      'filterNodeMethod',
    ) as (value: string, data: main.FileNode) => boolean
    const fileNode = tree[0].children?.[0].children?.[0] as main.FileNode
    expect(filterNodeMethod('plan', fileNode)).toBe(true)
    expect(filterNodeMethod('missing', fileNode)).toBe(false)
  })
})
