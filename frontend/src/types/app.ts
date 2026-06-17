import type { main } from '../../wailsjs/go/models'
import type { OutlineItem } from '../lib/outline'
import type { SearchResult } from '../lib/search'

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

export type UtilityPanel = 'outline' | 'search' | 'settings'

export interface SearchPanelState {
  query: string
  result: SearchResult
  activeIndex: number
}

export interface OutlinePanelState {
  items: OutlineItem[]
}
