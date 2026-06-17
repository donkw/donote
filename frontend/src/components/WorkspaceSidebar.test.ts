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
    children: [{ name: 'plan.md', path: 'projects/plan.md', type: 'file' }],
  }),
]

describe('WorkspaceSidebar', () => {
  test('renders workspace controls and file tree', () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: 'projects/plan.md',
        expandedFolderPaths: ['projects'],
      },
    })

    expect(wrapper.text()).toContain('notes')
    expect(wrapper.text()).toContain('打开文件夹')
    expect(wrapper.text()).toContain('projects')
    expect(wrapper.text()).toContain('plan.md')
    expect(wrapper.get('[data-test="folder-projects"]').classes()).toContain('folder')
    expect(wrapper.get('[data-test="file-projects/plan.md"]').classes()).toContain('active')
    expect(wrapper.get('[data-test="new-note"]').attributes('title')).toBe('新建笔记')
  })

  test('emits select-file with the file path', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects'],
      },
    })

    await wrapper.get('[data-test="file-projects/plan.md"]').trigger('click')

    expect(wrapper.emitted('select-file')).toEqual([['projects/plan.md']])
  })

  test('clicking a folder emits exactly one collapse intent', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects'],
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

    expect(getNode).toHaveBeenCalledWith(tree[0])
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

    expect(getNode).toHaveBeenCalledWith(tree[0])
    expect(expand).toHaveBeenCalledTimes(1)
    expect(collapse).not.toHaveBeenCalled()
    expect(wrapper.emitted('folder-expanded')).toEqual([['projects']])
    expect(wrapper.emitted('folder-collapsed')).toBeUndefined()
  })

  test('emits open and create intents', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: '',
        tree: [],
        activeFilePath: '',
        expandedFolderPaths: [],
      },
    })

    await wrapper.get('[data-test="open-workspace"]').trigger('click')
    await wrapper.get('[data-test="new-note"]').trigger('click')

    expect(wrapper.emitted('open-workspace')).toHaveLength(1)
    expect(wrapper.emitted('create-note')).toHaveLength(1)
  })
})
