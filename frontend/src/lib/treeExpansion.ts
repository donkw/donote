export const treeExpansionStorageKey = 'donote.treeExpansion'

type TreeExpansionStore = Record<string, string[]>

export function getCollapsedFolderPaths(
  workspaceRoot: string,
  storage: Storage | undefined = window.localStorage,
): string[] {
  const saved = readStore(storage)
  const paths = saved[workspaceRoot]
  if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
    return []
  }
  return sortUnique(paths)
}

export function saveCollapsedFolderPaths(
  workspaceRoot: string,
  paths: string[],
  storage: Storage | undefined = window.localStorage,
): string[] {
  const saved = readStore(storage)
  const next = sortUnique(paths)
  saved[workspaceRoot] = next
  storage?.setItem(treeExpansionStorageKey, JSON.stringify(saved))
  return next
}

export function toggleCollapsedFolderPath(current: string[], path: string): string[] {
  const collapsed = new Set(current)
  if (collapsed.has(path)) {
    collapsed.delete(path)
  } else {
    collapsed.add(path)
  }
  return sortUnique([...collapsed])
}

function readStore(storage: Storage | undefined): TreeExpansionStore {
  const value = storage?.getItem(treeExpansionStorageKey)
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(value)
    return isStore(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function isStore(value: unknown): value is TreeExpansionStore {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return Object.values(value).every(
    (paths) => Array.isArray(paths) && paths.every((path) => typeof path === 'string'),
  )
}

function sortUnique(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
