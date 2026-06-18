import type { main } from '../../wailsjs/go/models'
import type { OutlineItem } from '../lib/outline'

export interface VisibleNode {
  node: main.FileNode
  depth: number
}

export interface OpenDocument {
  path: string
  name: string
  content: string
  savedContent: string
  saving: boolean
  error: string
}

export type SaveState = 'saved' | 'saving' | 'dirty' | 'error'

export type UtilityPanel = 'outline' | 'settings'

export interface OutlinePanelState {
  items: OutlineItem[]
}
