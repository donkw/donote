export interface OpenDocumentSession {
  rootPath: string
  paths: string[]
  activePath: string
}

export const openDocumentSessionStorageKey = 'donote.openDocuments'

export function getInitialOpenDocumentSession(
  storage: Storage | undefined = window.localStorage,
): OpenDocumentSession | null {
  const stored = storage?.getItem(openDocumentSessionStorageKey)
  if (!stored) {
    return null
  }

  try {
    return normalizeOpenDocumentSession(JSON.parse(stored))
  } catch {
    return null
  }
}

export function saveOpenDocumentSession(
  value: unknown,
  storage: Storage | undefined = window.localStorage,
): OpenDocumentSession | null {
  const normalized = normalizeOpenDocumentSession(value)
  if (!normalized) {
    storage?.removeItem(openDocumentSessionStorageKey)
    return null
  }

  storage?.setItem(openDocumentSessionStorageKey, JSON.stringify(normalized))
  return normalized
}

export function clearOpenDocumentSession(storage: Storage | undefined = window.localStorage) {
  storage?.removeItem(openDocumentSessionStorageKey)
}

function normalizeOpenDocumentSession(value: unknown): OpenDocumentSession | null {
  if (!isRecord(value) || typeof value.rootPath !== 'string') {
    return null
  }

  const rootPath = value.rootPath.trim()
  if (!rootPath || !Array.isArray(value.paths)) {
    return null
  }

  const paths = unique(value.paths.map(normalizeMarkdownPath).filter((path) => path !== null))
  if (paths.length === 0) {
    return null
  }

  const activePath = normalizeMarkdownPath(value.activePath)
  return {
    rootPath,
    paths,
    activePath: activePath && paths.includes(activePath) ? activePath : paths[0],
  }
}

function normalizeMarkdownPath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().replaceAll('\\', '/')
  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[a-z]:/i.test(normalized) ||
    normalized.split('/').some((segment) => segment === '' || segment === '..') ||
    !normalized.toLocaleLowerCase().endsWith('.md')
  ) {
    return null
  }

  return normalized
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
