import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import WorkspaceSidebar from './WorkspaceSidebar.vue'

const tree = [
  {
    name: 'projects',
    path: 'projects',
    type: 'folder',
    children: [{ name: 'plan.md', path: 'projects/plan.md', type: 'file' }],
  },
]

describe('WorkspaceSidebar', () => {
  test('renders workspace controls and file tree', () => {
    const wrapper = mount(WorkspaceSidebar, {
      props: {
        workspaceName: 'notes',
        tree: tree as any,
        activeFilePath: '',
        expandedFolderPaths: ['projects'],
      },
    })

    expect(wrapper.text()).toContain('notes')
    expect(wrapper.text()).toContain('打开文件夹')
    expect(wrapper.text()).toContain('projects')
    expect(wrapper.text()).toContain('plan.md')
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
