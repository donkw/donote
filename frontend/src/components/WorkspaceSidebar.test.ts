import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
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
        activeFilePath: '',
        expandedFolderPaths: ['projects'],
      },
    })

    expect(wrapper.text()).toContain('notes')
    expect(wrapper.text()).toContain('打开文件夹')
    expect(wrapper.text()).toContain('projects')
    expect(wrapper.text()).toContain('plan.md')
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

    expect(folderRow.classes()).toContain('tree-row')
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

    await wrapper.get('[data-test="folder-projects"]').trigger('click')

    expect(wrapper.emitted('folder-expanded')).toEqual([['projects']])
    expect(wrapper.emitted('folder-collapsed')).toBeUndefined()
  })

  test('clicking the native expand caret emits the same collapse intent once', async () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree,
        activeFilePath: '',
        expandedFolderPaths: ['projects'],
      },
    })

    await wrapper.get('.el-tree-node__expand-icon').trigger('click')

    expect(wrapper.emitted('folder-collapsed')).toEqual([['projects']])
    expect(wrapper.emitted('folder-expanded')).toBeUndefined()
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
