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
  test('renders workspace title, search, and an indented file tree', () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: 'projects/plan.md',
        expandedFolderPaths: ['projects'],
      },
    })

    expect(wrapper.text()).toContain('notes')
    expect(wrapper.find('[data-test="open-workspace"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="new-note"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="file-tree-search"] input').attributes('placeholder')).toBe(
      '搜索文件',
    )
    expect(wrapper.text()).toContain('projects')
    expect(wrapper.text()).toContain('plan.md')
    expect(wrapper.get('[data-test="folder-projects"]').classes()).toContain('folder')
    expect(wrapper.get('[data-test="folder-projects"]').attributes('style')).toContain(
      '--tree-depth: 0',
    )
    expect(wrapper.get('[data-test="file-projects/plan.md"]').classes()).toContain('active')
    expect(wrapper.get('[data-test="file-projects/plan.md"]').attributes('style')).toContain(
      '--tree-depth: 1',
    )
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

  test('filters tree nodes from the sidebar search', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects'],
      },
    })

    const filter = vi.spyOn(wrapper.getComponent(ElTree).vm, 'filter')
    await wrapper.get('[data-test="file-tree-search"] input').setValue('plan')

    expect(filter).toHaveBeenLastCalledWith('plan')

    const filterNodeMethod = wrapper.getComponent(ElTree).props(
      'filterNodeMethod',
    ) as (value: string, data: main.FileNode) => boolean
    const fileNode = tree[0].children?.[0] as main.FileNode
    expect(filterNodeMethod('plan', fileNode)).toBe(true)
    expect(filterNodeMethod('missing', fileNode)).toBe(false)
  })
})
